import Glib from "gi://GLib";
import Gio from "gi://Gio";
import Shell from "gi://Shell";
import { Extension } from "resource:///org/gnome/shell/extensions/extension.js";
import { AppSearchProvider } from "resource:///org/gnome/shell/ui/appDisplay.js";
import { fileExists, readFile } from "./util.js";

export default class EmacsSearchProvider<T extends Extension>
  implements AppSearchProvider
{
  projects: string[] = [];
  extension: T;
  app: Shell.App | null = null;
  appInfo: Gio.DesktopAppInfo | undefined;

  constructor(extension: T) {
    this.extension = extension;
    this._findApp();
    this._loadWorkspaces();
    this.appInfo = this.app?.appInfo;
  }

  _loadWorkspaces() {
    const projectList = this._getProjectList();
    if (!projectList) {
      logError("Failed to read Emacs `projects` file");
      return;
    }

    this.projects = projectList;
  }

  _getProjectList(): string[] | undefined {
    const possibleLocations = [
      // Doom Emacs
      `${Glib.get_home_dir()}/.emacs.d/.local/state/projects`,
    ];

    for (const projectsPath of possibleLocations) {
      if (!fileExists(projectsPath)) {
        continue;
      }

      const projectsLispData = readFile(projectsPath);

      if (projectsLispData) {
        return projectsLispData
          .replace(/;.*\n/g, "")
          .split(/\s*\(*"|"\)*\s*/)
          .filter((s) => !s.match(/^[()\s]*$/));
      }
    }
  }

  _findApp() {
    this.app = Shell.AppSystem.get_default().lookup_app("emacs.desktop");
    if (!this.app) {
      logError("Failed to find Emacs application");
    }
  }

  activateResult(path: string): void {
    if (this.app) {
      try {
        Gio.Subprocess.new(
          [this.app?.app_info.get_executable(), "--chdir", path],
          Gio.SubprocessFlags.NONE,
        );
      } catch (e) {
        logError(e);
      }
    }
  }

  filterResults(results: string[], maxResults: number) {
    return results.slice(0, maxResults);
  }

  async getInitialResultSet(terms: string[]) {
    this._loadWorkspaces();
    const searchTerm = terms.join("").toLowerCase();
    return this.projects.filter((path) =>
      path.toLowerCase().includes(searchTerm),
    );
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
