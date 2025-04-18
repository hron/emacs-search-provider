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

    // Create a preferences page, with a single group
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

    // Create a new preferences row with a button
    const buttonRow = new Adw.ActionRow({
      title: _("`projects` file location"),
      subtitleLines: 2,
      subtitle: this._generateSubtitle(
        window._settings.get_string("projects-path"),
      ),
    });
    group.add(buttonRow);

    const clearButton = new Gtk.Button({
      label: _("Clear"),
      valign: Gtk.Align.CENTER,
      halign: Gtk.Align.CENTER,
    });
    buttonRow.add_suffix(clearButton);
    clearButton.connect("clicked", () => {
      window._settings!.set_string("projects-path", "");
      buttonRow.set_subtitle(this._generateSubtitle(""));
    });

    const selectButton = new Gtk.Button({
      label: _("Select"),
      valign: Gtk.Align.CENTER,
      halign: Gtk.Align.CENTER,
    });
    buttonRow.add_suffix(selectButton);
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
        buttonRow.set_subtitle(this._generateSubtitle(filePath));
      });
    });
  }

  _generateSubtitle(path: string) {
    return _(
      "The extension checks default locations automatically, but you can add a custom one here\n" +
        "Current value: " +
        (path === "" ? "N/A" : path),
    );
  }
}
