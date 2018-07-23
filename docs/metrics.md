# Notes Metrics
The metrics collection and analysis plan for Notes, a Test Pilot experiment.


## Analysis
Data collected by Notes will be used to answer the following high-level questions:

- Do people take notes in Firefox?
	- In what intervals?
	- In what circumstances?
	- How many notes?
- What are the notes like?
	- How long are they?
	- Do they span multiple lines?
	- Do they use formatting options? Which are most common?
- Do people sync?
	- How does syncing affect engagement?
	- How does engagement affect syncing?

Note: sync will not be part of the first release of this experiment; all sync-related metrics will be reported when that feature is offered.

## Collection
Data will be collected with Google Analytics and follow [Test Pilot standards](https://github.com/mozilla/testpilot/blob/master/docs/experiments/ga.md) for reporting.

### Custom Metrics
- `cm1` - the size of the notepad, in characters, with markup removed.
- `cm2` - the size of the notepad, measured by the number of lines.
- `cm3` - the size of the change, measured in the number of characters different between the content of the notepad when they began editing and the contents when the `change` event was fired, with markup removed.

### Custom Dimensions
- `cd1` - whether sync is enabled for the current user. One of `true` or `false`.
- `cd2` - whether the user has, anywhere in their active notepad, changed the size of text from the default. One of `true` or `false`.
- `cd3` - whether the user has, anywhere in their active notepad, bolded text. One of `true` or `false`.
- `cd4` - whether the user has, anywhere in their active notepad, italicized text. One of `true` or `false`.
- `cd5` - whether the user has, anywhere in their active notepad, strikethrough text. One of `true` or `false`.
- `cd6` - whether the user has, anywhere in their active notepad, a list. One of `true` or `false`.
- `cd7` - the UI element used to open or close the notepad. Possible values TBD, but may include `closeButton`, `sidebarButton`, `sidebarSwitcher`, `appBackground`, `appInactive`.
- `cd8` - the reason an editing session ended. One of `timeout` or `closed`.
- `cd9` - whether the user was able to load the note panel or not. One of `true` or `false`.
- `cd10` - provide current user state. Possible values are: 'error', 'isSyncing', 'synced', 'openLogin', 'verifyAccount', 'reconnectSync', and 'signIn'.
- `cd11` - count of total notes when event is fired: range of 0 to N

### Events

#### `open`
An event fired when the user actively navigates to the Notes sidebar. Includes:

- `ec` - `notes`
- `ea` - `open`
- `cd9`
- `cd10`
- `cd11`

#### `close`
An event fired when the user actively navigates away from the Notes sidebar. Includes:

- `ec` - `notes`
- `ea` - `close`
- `cd7`
- `cd8`
- `cd10`
- `cd11`

#### `changed`
An event fired when the user completes a change of the content of the active notepad. It prospectively begins when a user focuses on the notepad's editable area, and ends when the user either 1) closes the sidebar, or 2) does not make any changes in 20 seconds. Includes:

- `ec` - `notes`
- `ea` - `changed`
- `cm1`
- `cm2`
- `cm3`
- `cd1`
- `cd2`
- `cd3`
- `cd4`
- `cd5`
- `cd6`
- `cd10`
- `cd11`

#### `drag-n-drop`
An event fired when the user tries to drag or drop a content into the notepad.

- `ec` - `notes`
- `ea` - `drag-n-drop`
- `cm1`
- `cm2`
- `cm3`
- `cd1`
- `cd2`
- `cd3`
- `cd4`
- `cd5`
- `cd6`
- `cd10`
- `cd11`

#### `new-note`
Event fired when a user creates a new note.
- `ec` - `notes`
- `ea` - `new-note`
- `el` - one of `in-note`, `list-view`, and `send-to-note` where `in-note` refers to the meatball menu flow, `list-view` refers to the button in the list view, and `send-to-note` refers to the context menu action performed while displaying the list view.
- `cd10`
- `cd11`

#### `export`
An event fired when a user exports a note.
- `ec` - `notes`
- `ea` - `export`
- `el` - one of `html`, `markdown`, `plaintext`, `richtext`
- `cd10`
- `cd11`

### `delete-note`
Event fired when a user deletes a note.
- `ec` - `notes`
- `ea` - `new-note`
- `el` - one of `in-note` or `blank-note` which occurs when the user navigates back from a new note without adding content
- `cd10`
- `cd11`

### `give-feedback`
Event fired when a user deletes a note.
- `ec` - `notes`
- `ea` - `give-feedback`
- `cd10`
- `cd11`

#### `sync-started` (deprecated)

> Replaced with `webext-button-authenticate`, `login-sucess`, `login-failed`

An event fired whenever the user attempts to login to sync. Includes:

- `ec` - `notes`
- `ea` - `sync-started`
- `cd11`

#### `login-success`
An event fired whenever the user enables sync successfully. Includes:

- `ec` - `notes`
- `ea` - `login-success`
- `cd11`

#### `login-failed`
An event fired whenever the user enables sync but the FxA login fails. Includes:

- `ec` - `notes`
- `ea` - `login-failed`
- `cd11`

#### `theme-changed`
An event fired whenever the user changes the theme. Includes:

- `ec` - `notes`
- `ea` - `theme-changed`
- `cd11`

#### `webext-button-authenticate`
An event fired when user presses the sync button

- `ec` - `notes`
- `ea` - `webext-button-authenticate`
- `cd11`

#### `webext-button-disconnect`
An event fired when user logs out of sync

- `ec` - `notes`
- `ea` - `webext-button-disconnect`
- `cd11`

#### `handle-conflict`
An event fired when sync resolved a sync conflict

- `ec` - `notes`
- `ea` - `handle-conflict`
- `cd11`

#### `reconnect-sync`
An event fired when user closes sync due to a password reset or change

- `ec` - `notes`
- `ea` - `reconnect-sync`
- `cd11`

#### `context-menu`
An event fired when the "Send to Notes" context menu is used

- `ec` - `notes`
- `ea` - `metrics-context-menu`
- `cd11`

#### `limit-reached` (deprecated)
An event fired when user goes over the pad limit (15000 character)

- `ec` - `notes`
- `ea` - `limit-reached`
- `cm1`
- `cm2`
- `cd1`
- `cd2`
- `cd3`
- `cd4`
- `cd5`
- `cd6`
- `cd10`
- `cd11`

#### `idb-fail`
An event fired when IndexedDB fails to load

- `ec` - `notes`
- `ea` - `idb-fail`

### `delete-deleted-notes`
A client retrieved notes which have been deleted on client side but not proparly
deleted on server side. Those were deleted before v4.0.0-beta.4 (during multi-note implementation).

- `ec` - `notes`
- `ea` - `delete-deleted-notes`
