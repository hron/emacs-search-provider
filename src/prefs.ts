import Gio from "gi://Gio";
import Gtk from "gi://Gtk";
import Adw from "gi://Adw";

import {
  ExtensionPreferences,
  gettext as _,
} from "resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js";

type Window = Adw.PreferencesWindow & {
  _settings: Gio.Settings | null;
};

export default class Preferences extends ExtensionPreferences {
  _settings: Gio.Settings | null = null;

  fillPreferencesWindow(window: Window) {
    window._settings = this.getSettings();

    const page = new Adw.PreferencesPage({
      title: _("General"),
      icon_name: "dialog-information-symbolic",
    });
    window.add(page);

    const group = new Adw.PreferencesGroup({
      title: _("Settings"),
      description: _("Extension Settings"),
    });
    page.add(group);

    this.setupProjectsFileRow(window, group);
    this.setupEmacsExecRow(window, group);
  }

  private setupEmacsExecRow(window: Window, group: Adw.PreferencesGroup) {
    const settingName = "emacs-exec";

    const row = new Adw.EntryRow({
      title: _(
        "Emacs command to run for a project (default: emacs --chdir %PROJECT_DIR%)",
      ),
      text: window._settings!.get_string(settingName),
    });
    group.add(row);

    let timeoutId: number | NodeJS.Timeout | undefined;
    row.connect("changed", (widget) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        window._settings!.set_string(settingName, widget.get_text());
      }, 1000);
    });
  }

  private setupProjectsFileRow(window: Window, group: Adw.PreferencesGroup) {
    const projectsFileRow = new Adw.ActionRow({
      title: _("`projects` file location"),
      subtitleLines: 2,
      subtitle: this.subtitleForProjectsFile(
        window._settings!.get_string("projects-path"),
      ),
    });
    group.add(projectsFileRow);

    const clearButton = new Gtk.Button({
      label: _("Clear"),
      valign: Gtk.Align.CENTER,
      halign: Gtk.Align.CENTER,
    });
    projectsFileRow.add_suffix(clearButton);
    clearButton.connect("clicked", () => {
      window._settings!.set_string("projects-path", "");
      projectsFileRow.set_subtitle(this.subtitleForProjectsFile(""));
    });

    const selectButton = new Gtk.Button({
      label: _("Select"),
      valign: Gtk.Align.CENTER,
      halign: Gtk.Align.CENTER,
    });
    projectsFileRow.add_suffix(selectButton);
    const projectsFileChooser = new Gtk.FileDialog({
      accept_label: "Select",
      modal: true,
      title: _("Select `projects` file"),
    });
    selectButton.connect("clicked", () => {
      // @ts-expect-error Typescript types for `open` is incorrect
      projectsFileChooser.open(window, null, (self, res) => {
        const filePath = self.open_finish(res).get_uri().replace("file://", "");
        window._settings!.set_string("projects-path", filePath);
        projectsFileRow.set_subtitle(this.subtitleForProjectsFile(filePath));
      });
    });
  }

  private subtitleForProjectsFile(path: string) {
    return _(
      "The extension checks default locations automatically, but you can add a custom one here\n" +
        "Current value: " +
        (path === "" ? "N/A" : path),
    );
  }
}
