import Glib from "gi://GLib";
import Gio from "gi://Gio";
import Shell from "gi://Shell";
import { Extension } from "resource:///org/gnome/shell/extensions/extension.js";
import { AppSearchProvider } from "resource:///org/gnome/shell/ui/appDisplay.js";
import { fileExists, readFile } from "./util.js";

export default class EmacsSearchProvider<
  T extends Extension & { _settings: Gio.Settings | null },
> implements AppSearchProvider
{
  projects: string[] = [];
  extension: T;
  app: Shell.App | null = null;
  appInfo: Gio.DesktopAppInfo | undefined;

  constructor(extension: T) {
    this.extension = extension;
    this._findApp();
    this._loadProjects();
    this.appInfo = this.app?.appInfo;
  }

  _loadProjects() {
    const projectList = this._getProjectList();
    if (!projectList) {
      log("Failed to read Emacs `projects` file");
      return;
    }

    this.projects = projectList;
  }

  _getProjectList(): string[] | undefined {
    const possibleLocations = [
      this._projectsPathFromSettings(),
      // Doom Emacs - projectile
      `${Glib.get_home_dir()}/.emacs.d/.local/cache/projectile/projects.eld`,
      // Doom Emacs - project.el
      `${Glib.get_home_dir()}/.emacs.d/.local/state/projects`,
      // Default for projectile
      `${Glib.get_home_dir()}/.emacs.d/.local/cache/projectile-bookmarks.eld`,
      // Default for project.el
      `${Glib.get_home_dir()}/.emacs.d/.local/cache/projects`,
    ];

    for (const projectsPath of possibleLocations) {
      if (!projectsPath || !fileExists(projectsPath)) {
        continue;
      }

      const projectsLispData = readFile(projectsPath);

      if (projectsLispData) {
        return projectsLispData
          .replace(/;.*\n/g, "")
          .split(/\s*\(*"|"\)*\s*/)
          .filter((s) => !s.match(/^[()\s]*$/))
          .map((s) => s.replace(new RegExp(`^${Glib.get_home_dir()}`), "~"));
      }
    }
  }

  _findApp() {
    this.app = Shell.AppSystem.get_default().lookup_app("emacs.desktop");
    if (!this.app) {
      print("Failed to find Emacs application");
    }
  }

  activateResult(path: string): void {
    if (this.app) {
      try {
        const fullPath = this._resolveHomePath(path);
        Gio.Subprocess.new(
          [this.app?.app_info.get_executable(), "--chdir", fullPath],
          Gio.SubprocessFlags.NONE,
        );
      } catch (e) {
        logError(e);
      }
    }
  }

  _projectsPathFromSettings(): string | undefined {
    return this.extension?._settings?.get_string("projects-path");
  }

  _resolveHomePath(path: string): string {
    return path.replace(/^~/, Glib.get_home_dir());
  }

  filterResults(results: string[], maxResults: number) {
    return results.slice(0, maxResults);
  }

  async getInitialResultSet(terms: string[]) {
    this._loadProjects();
    return this.getSubsearchResultSet(this.projects, terms);
  }

  async getSubsearchResultSet(previousResults: string[], terms: string[]) {
    const searchTerm = terms.join("").toLowerCase();
    return previousResults.filter((path) =>
      path.toLowerCase().includes(searchTerm),
    );
  }

  async getResultMetas(projects: string[]) {
    return projects.map((project) => ({
      id: project,
      name:
        project
          .split("/")
          .filter((p) => p)
          .at(-1) || project,
      description: project,
      createIcon: (size: number) => this.app?.create_icon_texture(size),
    }));
  }
}
