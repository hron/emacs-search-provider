import { test } from "uvu";
import * as assert from "uvu/assert";
import { readFileSync } from "fs";

import Glib from "gi://GLib";
import Provider from "../src/provider";

test("should return instance of provider", () => {
  const provider = new Provider();
  assert.instance(provider, Provider);
});

test("should read projects in projectile format", () => {
  const origFileGetContents = Glib.file_get_contents;
  try {
    Glib.file_get_contents = function () {
      return [true, readFileSync("tests/fixtures/projectile.eld")];
    };

    const provider = new Provider();
    assert.equal(provider.projects, [
      "~/src/emacs-search-provider/",
      "~/src/dotfiles/",
      "~/src/linux/",
    ]);
  } finally {
    Glib.file_get_contents = origFileGetContents;
  }
});

test("should read projects in project.el format", () => {
  const provider = new Provider();
  assert.equal(provider.projects, [
    "/home/john/src/emacs-search-provider/",
    "/home/john/src/dotfiles/",
    "/home/john/src/linux/",
  ]);
});

test.run();
