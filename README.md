jquery.editablehints.js
=======================

###Description

Enable a intellisense/hints popup on DOM element that have content editable attribute when a trigger key is press.

###Usage

See demo page's source code.

###Known Issue

- Does not work in RTE plugin that uses iframe
- Popup is not in proper place on Firefox, and is out of place for IE
- Inserting from popup menu in middle of other text on IE will generate link
- Scrolling and clicking other stuff when popup is showing, will unbind the key for selecting the popup menu