import createMenu from "./AppMenu";
import { JSX, Signal, createEffect, createSignal } from "solid-js";
import { KeybindQuery } from "~/API/Keybind";
import Tab from "~/API/Tab";
import Velocity from "~/API/index";
import { bookmarks, bookmarksShown, setBookmarksShown } from "~/data/appState";
import HistoryEntry from "~/types/HistoryEntry";
import { engines, preferences } from "~/util/";
import { getActiveTab } from "~/util/";
import * as urlUtil from "~/util/url";

export default function Utility(): JSX.Element {
  function reload() {
    if (getActiveTab()?.loading()) {
      getActiveTab()?.stop();
    } else {
      getActiveTab().search = false;
      getActiveTab()?.reload();
    }
  }

  function forward() {
    getActiveTab().search = false;
    getActiveTab()?.goForward();
  }

  function back() {
    getActiveTab().search = false;
    getActiveTab()?.goBack();
  }

  function urlBar(element: HTMLInputElement) {
    element.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        if (element.value) {
          getActiveTab()?.navigate(element.value);
          getActiveTab().search = false;
          element.blur();
        }
      } else if (event.key === "Escape") {
        getActiveTab().search = false;
        element.blur();
      } else {
        setTimeout(() => (getActiveTab().search = element.value), 0);
      }
    });
  }
  let {
    close: closeMenu,
    current: currentMenu,
    stack: submenuStack,
    submenus: submenus,
    Menu,
    MenuItem,
    KeybindMenuItem,
    SubmenuMenuItem,
    MenuSeparator,
    SubmenuHeader
  } = createMenu([
    "main",
    "bookmarks",
    "history",
    "tools",
    "help",
    "recentTabs",
    "recentWindows"
  ]);

  createEffect(() => {
    submenus.main[1](
      Menu(
        "main",
        KeybindMenuItem(true, "New tab", { alias: "new_tab" }),
        KeybindMenuItem(false, "New window", { alias: "new_window" }),

        MenuSeparator(),

        SubmenuMenuItem(true, "Bookmarks", "bookmarks"),
        SubmenuMenuItem(true, "History", "history"),

        KeybindMenuItem(false, "Downloads", { alias: "open_downloads" }),
        MenuItem(false, "Passwords", null, () => {}),
        KeybindMenuItem(false, "Add-ons and themes", { alias: "open_addons" }),

        MenuSeparator(),

        KeybindMenuItem(false, "Print...", { alias: "print_page" }),
        KeybindMenuItem(false, "Save page as...", { alias: "save_page" }),
        KeybindMenuItem(false, "Find in page...", { alias: "search_page" }),

        MenuItem(false, "Zoom", null, () => {}),

        MenuSeparator(),

        MenuItem(
          true,
          "Settings",
          null,
          () => new Tab("about:preferences", true)
        ),
        SubmenuMenuItem(true, "More tools", "tools"),
        SubmenuMenuItem(false, "Help", "help"),

        MenuSeparator(),

        MenuItem(false, "Quit", null, () => {})
      )
    );
  });

  createEffect(() => {
    submenus.bookmarks[1](
      Menu(
        "bookmarks",
        SubmenuHeader("Bookmarks"),
        <div class="grow relative">
          <div class="absolute w-full h-full overflow-y-auto overflow-x-hidden">
            {KeybindMenuItem(true, "Bookmark current tab", {
              alias: "bookmark_tab"
            })}
            {MenuItem(false, "Search bookmarks", null, () => {})}
            {MenuItem(
              true,
              <>
                {bookmarksShown()
                  ? "Hide bookmarks toolbar"
                  : "Show bookmarks toolbar"}
              </>,
              null,
              () => {
                setBookmarksShown(!bookmarksShown());
              }
            )}
            {MenuSeparator("Recent Bookmarks")}
            {bookmarks().length > 0
              ? bookmarks().map((bookmark) =>
                  MenuItem(
                    true,
                    <>
                      <div class="w-4 h-4 mb-0.5 mr-2 flex flex-row items-center">
                        <img src={bookmark.icon} />
                      </div>
                      <div>{bookmark.name}</div>
                    </>,
                    null,
                    () => new window.parent.Velocity.Tab(bookmark.url, true)
                  )
                )
              : MenuItem(
                  false,
                  "(Empty)",
                  null,
                  () => {},
                  "pointer-events-none"
                )}
          </div>
        </div>,

        MenuSeparator(),

        MenuItem(
          true,
          "Manage Bookmarks",
          null,
          () => new Tab("about:bookmarks", true)
        )
      )
    );
  });

  const HISTORY_SUBMENU_RECENCY: number = 864e5; // 1 day
  let historyEntries = createSignal<HistoryEntry[]>([]);
  createEffect(() => {
    if (currentMenu[0]() === "history")
      Velocity.history.get().then((history) => {
        let timestamp = Date.now();
        historyEntries[1](
          history.filter(
            (entry) =>
              Math.abs(timestamp - entry.timestamp) <= HISTORY_SUBMENU_RECENCY // only include entries with specified recency
          )
        );
      });
    submenus.history[1](
      Menu(
        "history",
        SubmenuHeader("History"),
        <div class="grow relative">
          <div class="absolute w-full h-full overflow-y-auto overflow-x-hidden">
            {SubmenuMenuItem(false, "Recently closed tabs", "recentTabs")}
            {SubmenuMenuItem(false, "Recently closed windows", "recentWindows")}
            {MenuItem(false, "Restore previous session", null, () => {})}
            {MenuSeparator()}
            {/* reenable this after a clear data popup with time constraints is implemented */}
            {MenuItem(false, "Clear Recent History", null, () => {})}

            {MenuSeparator("Recent History")}
            {historyEntries[0]().length > 0
              ? historyEntries[0]().map((entry) =>
                  MenuItem(
                    true,
                    <>
                      <div class="w-4 h-4 mb-0.5 mr-2 flex flex-row items-center">
                        <img src={entry.favicon} />
                      </div>
                      <div>{entry.title}</div>
                    </>,
                    null,
                    () => new window.parent.Velocity.Tab(entry.url, true)
                  )
                )
              : MenuItem(
                  false,
                  "(Empty)",
                  null,
                  () => {},
                  "pointer-events-none"
                )}
          </div>
        </div>,

        MenuSeparator(),

        MenuItem(
          true,
          "Manage History",
          null,
          () => new Tab("about:history", true)
        )
      )
    );
  });

  createEffect(() => {
    submenus.tools[1](
      Menu(
        "tools",
        SubmenuHeader("More Tools"),

        MenuItem(false, "Customize toolbar...", null, () => {}),

        MenuSeparator("Browser tools"),

        KeybindMenuItem(true, "Web Developer Tools", {
          alias: "open_devtools"
        }),
        MenuItem(false, "Task Manager", null, () => {}),
        MenuItem(false, "Remote Debugging", null, () => {}),
        MenuItem(false, "Browser Console", null, () => {}),
        MenuItem(false, "Responsive Debugging", null, () => {}),
        MenuItem(false, "Eyedropper", null, () => {}),
        KeybindMenuItem(true, "Page Source", {
          alias: "view_source"
        }),
        MenuItem(false, "Extensions for developers", null, () => {})
      )
    );
  });

  let menuContainer: HTMLDivElement | undefined;
  return (
    <div class="flex items-center gap-2 w-full h-10 p-2" id="browser-toolbar">
      <div class="flex gap-1 items-center">
        <div
          class="toolbarbutton-1 h-8 w-8 rounded flex items-center justify-center"
          onClick={back}
        >
          <i class="fa-light fa-arrow-left mt-[2px]"></i>
        </div>
        <div
          class="toolbarbutton-1 h-8 w-8 rounded flex items-center justify-center"
          onClick={forward}
        >
          <i class="fa-light fa-arrow-right mt-[2px]"></i>
        </div>
        <div
          class="toolbarbutton-1 h-8 w-8 rounded flex items-center justify-center"
          onClick={reload}
        >
          <i
            class={`fa-light ${
              getActiveTab()?.loading() ? "fa-xmark" : "fa-rotate-right"
            } mt-[2px]`}
          ></i>
        </div>
      </div>
      <div
        class="flex items-center flex-1 h-[32px] text-sm rounded"
        id="urlbar"
      >
        <div class="flex h-8 w-8 rounded items-center justify-center mx-[2px]">
          <i class="fa-light fa-magnifying-glass mt-[2px]"></i>
        </div>
        <input
          ref={urlBar}
          id="url_bar"
          autocomplete="off"
          class="flex-1 flex items-center leading-8 h-full text-sm rounded bg-transparent focus:outline-none"
          value={
            getActiveTab()?.search() !== false
              ? (getActiveTab()?.search() as string)
              : urlUtil.normalize(getActiveTab()?.url() || "")
          }
          placeholder={`Search with ${
            engines[preferences()["search.defaults.searchEngine"] || "google"]
              .name
          } or enter address`}
        ></input>
      </div>
      <div class="flex gap-1 items-center">
        <a
          target="_blank"
          href="https://github.com/cohenerickson/Velocity"
          class="cursor-default"
        >
          <div class="toolbarbutton-1 h-8 w-8 rounded flex items-center justify-center">
            <i class="fa-brands fa-github mt-[2px] text-sm"></i>
          </div>
        </a>

        <div
          class="toolbarbutton-1 relative h-8 w-8 rounded flex items-center justify-center"
          onClick={(e) => {
            if (menuContainer?.contains(e.target as Node)) return;
            currentMenu[1]((m) => (m === null ? "main" : null));
            submenuStack.push("main");
          }}
        >
          <i class="fa-light fa-bars mt-[2px] text-sm"></i>
          {currentMenu[0]() !== null ? (
            <>
              <div
                class="fixed w-full h-full top-0 left-0"
                onPointerDown={() => closeMenu()}
              ></div>

              <div
                ref={menuContainer}
                class="panel appmenu top-9 right-0.5 w-[22rem] text-[0.9rem] shadow-lg rounded-lg border px-2 py-2 z-30 absolute grid grid-cols-[1fr]"
              >
                {...Object.values(submenus).map((m) => m[0]())}
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
