/*! ri-backoffice ri-backoffice 2021-11-05 */

(function(root, factory) {
    if (typeof define === "function" && define.amd) {
        define(factory);
    } else if (typeof module === "object" && module.exports) {
        module.exports = factory();
    } else {
        root.safeAccess = factory();
    }
})(this, function() {
    return function access(obj, accessStr) {
        if (isUndefined(accessStr)) {
            return access.bind(null, obj);
        }
        var funcArgs = Array.prototype.slice.call(arguments, 2);
        return helper(obj, tokenize(accessStr), null, funcArgs);
    };
    function helper(obj, tokens, ctx, fnArgs) {
        if (tokens.length === 0) {
            return obj;
        }
        var currentToken = tokens[0];
        if (isUndefined(obj) || isNull(obj) || isTokenFunctionCall(currentToken) && !isFunction(obj)) {
            return undefined;
        }
        if (isTokenFunctionCall(currentToken)) {
            return helper(obj[isArray(fnArgs[0]) ? "apply" : "call"](ctx, fnArgs[0]), tokens.slice(1), null, fnArgs.slice(1));
        } else if (isTokenArrayAccess(currentToken)) {
            return helper(obj[parseInt(currentToken.substr(1), 10)], tokens.slice(1), isTokenFunctionCall(tokens[1]) ? obj : ctx, fnArgs);
        } else {
            return helper(obj[currentToken], tokens.slice(1), isTokenFunctionCall(tokens[1]) ? obj : ctx, fnArgs);
        }
    }
    function isUndefined(a) {
        return a === void 0;
    }
    function isNull(a) {
        return a === null;
    }
    function isArray(a) {
        return Array.isArray(a);
    }
    function isFunction(a) {
        return typeof a === "function";
    }
    function isTokenFunctionCall(token) {
        return token === "()";
    }
    function isTokenArrayAccess(token) {
        return /^\[\d+\]$/.test(token);
    }
    function tokenize(str) {
        return str.split(/\.|(\(\))|(\[\d+?])/).filter(function(t) {
            return t;
        });
    }
});

(function(mod) {
    if (typeof exports == "object" && typeof module == "object") module.exports = mod(); else if (typeof define == "function" && define.amd) return define([], mod); else this.CodeMirror = mod();
})(function() {
    "use strict";
    var gecko = /gecko\/\d/i.test(navigator.userAgent);
    var ie_upto10 = /MSIE \d/.test(navigator.userAgent);
    var ie_11up = /Trident\/(?:[7-9]|\d{2,})\..*rv:(\d+)/.exec(navigator.userAgent);
    var ie = ie_upto10 || ie_11up;
    var ie_version = ie && (ie_upto10 ? document.documentMode || 6 : ie_11up[1]);
    var webkit = /WebKit\//.test(navigator.userAgent);
    var qtwebkit = webkit && /Qt\/\d+\.\d+/.test(navigator.userAgent);
    var chrome = /Chrome\//.test(navigator.userAgent);
    var presto = /Opera\//.test(navigator.userAgent);
    var safari = /Apple Computer/.test(navigator.vendor);
    var khtml = /KHTML\//.test(navigator.userAgent);
    var mac_geMountainLion = /Mac OS X 1\d\D([8-9]|\d\d)\D/.test(navigator.userAgent);
    var phantom = /PhantomJS/.test(navigator.userAgent);
    var ios = /AppleWebKit/.test(navigator.userAgent) && /Mobile\/\w+/.test(navigator.userAgent);
    var mobile = ios || /Android|webOS|BlackBerry|Opera Mini|Opera Mobi|IEMobile/i.test(navigator.userAgent);
    var mac = ios || /Mac/.test(navigator.platform);
    var windows = /win/i.test(navigator.platform);
    var presto_version = presto && navigator.userAgent.match(/Version\/(\d*\.\d*)/);
    if (presto_version) presto_version = Number(presto_version[1]);
    if (presto_version && presto_version >= 15) {
        presto = false;
        webkit = true;
    }
    var flipCtrlCmd = mac && (qtwebkit || presto && (presto_version == null || presto_version < 12.11));
    var captureRightClick = gecko || ie && ie_version >= 9;
    var sawReadOnlySpans = false, sawCollapsedSpans = false;
    function CodeMirror(place, options) {
        if (!(this instanceof CodeMirror)) return new CodeMirror(place, options);
        this.options = options = options ? copyObj(options) : {};
        copyObj(defaults, options, false);
        setGuttersForLineNumbers(options);
        var doc = options.value;
        if (typeof doc == "string") doc = new Doc(doc, options.mode);
        this.doc = doc;
        var display = this.display = new Display(place, doc);
        display.wrapper.CodeMirror = this;
        updateGutters(this);
        themeChanged(this);
        if (options.lineWrapping) this.display.wrapper.className += " CodeMirror-wrap";
        if (options.autofocus && !mobile) focusInput(this);
        this.state = {
            keyMaps: [],
            overlays: [],
            modeGen: 0,
            overwrite: false,
            focused: false,
            suppressEdits: false,
            pasteIncoming: false,
            cutIncoming: false,
            draggingText: false,
            highlight: new Delayed(),
            keySeq: null
        };
        if (ie && ie_version < 11) setTimeout(bind(resetInput, this, true), 20);
        registerEventHandlers(this);
        ensureGlobalHandlers();
        startOperation(this);
        this.curOp.forceUpdate = true;
        attachDoc(this, doc);
        if (options.autofocus && !mobile || activeElt() == display.input) setTimeout(bind(onFocus, this), 20); else onBlur(this);
        for (var opt in optionHandlers) if (optionHandlers.hasOwnProperty(opt)) optionHandlers[opt](this, options[opt], Init);
        maybeUpdateLineNumberWidth(this);
        for (var i = 0; i < initHooks.length; ++i) initHooks[i](this);
        endOperation(this);
    }
    function Display(place, doc) {
        var d = this;
        var input = d.input = elt("textarea", null, null, "position: absolute; padding: 0; width: 1px; height: 1em; outline: none");
        if (webkit) input.style.width = "1000px"; else input.setAttribute("wrap", "off");
        if (ios) input.style.border = "1px solid black";
        input.setAttribute("autocorrect", "off");
        input.setAttribute("autocapitalize", "off");
        input.setAttribute("spellcheck", "false");
        d.inputDiv = elt("div", [ input ], null, "overflow: hidden; position: relative; width: 3px; height: 0px;");
        d.scrollbarH = elt("div", [ elt("div", null, null, "height: 100%; min-height: 1px") ], "CodeMirror-hscrollbar");
        d.scrollbarV = elt("div", [ elt("div", null, null, "min-width: 1px") ], "CodeMirror-vscrollbar");
        d.scrollbarFiller = elt("div", null, "CodeMirror-scrollbar-filler");
        d.gutterFiller = elt("div", null, "CodeMirror-gutter-filler");
        d.lineDiv = elt("div", null, "CodeMirror-code");
        d.selectionDiv = elt("div", null, null, "position: relative; z-index: 1");
        d.cursorDiv = elt("div", null, "CodeMirror-cursors");
        d.measure = elt("div", null, "CodeMirror-measure");
        d.lineMeasure = elt("div", null, "CodeMirror-measure");
        d.lineSpace = elt("div", [ d.measure, d.lineMeasure, d.selectionDiv, d.cursorDiv, d.lineDiv ], null, "position: relative; outline: none");
        d.mover = elt("div", [ elt("div", [ d.lineSpace ], "CodeMirror-lines") ], null, "position: relative");
        d.sizer = elt("div", [ d.mover ], "CodeMirror-sizer");
        d.heightForcer = elt("div", null, null, "position: absolute; height: " + scrollerCutOff + "px; width: 1px;");
        d.gutters = elt("div", null, "CodeMirror-gutters");
        d.lineGutter = null;
        d.scroller = elt("div", [ d.sizer, d.heightForcer, d.gutters ], "CodeMirror-scroll");
        d.scroller.setAttribute("tabIndex", "-1");
        d.wrapper = elt("div", [ d.inputDiv, d.scrollbarH, d.scrollbarV, d.scrollbarFiller, d.gutterFiller, d.scroller ], "CodeMirror");
        if (ie && ie_version < 8) {
            d.gutters.style.zIndex = -1;
            d.scroller.style.paddingRight = 0;
        }
        if (ios) input.style.width = "0px";
        if (!webkit) d.scroller.draggable = true;
        if (khtml) {
            d.inputDiv.style.height = "1px";
            d.inputDiv.style.position = "absolute";
        }
        if (ie && ie_version < 8) d.scrollbarH.style.minHeight = d.scrollbarV.style.minWidth = "18px";
        if (place) {
            if (place.appendChild) place.appendChild(d.wrapper); else place(d.wrapper);
        }
        d.viewFrom = d.viewTo = doc.first;
        d.view = [];
        d.externalMeasured = null;
        d.viewOffset = 0;
        d.lastWrapHeight = d.lastWrapWidth = 0;
        d.updateLineNumbers = null;
        d.lineNumWidth = d.lineNumInnerWidth = d.lineNumChars = null;
        d.prevInput = "";
        d.alignWidgets = false;
        d.pollingFast = false;
        d.poll = new Delayed();
        d.cachedCharWidth = d.cachedTextHeight = d.cachedPaddingH = null;
        d.inaccurateSelection = false;
        d.maxLine = null;
        d.maxLineLength = 0;
        d.maxLineChanged = false;
        d.wheelDX = d.wheelDY = d.wheelStartX = d.wheelStartY = null;
        d.shift = false;
        d.selForContextMenu = null;
    }
    function loadMode(cm) {
        cm.doc.mode = CodeMirror.getMode(cm.options, cm.doc.modeOption);
        resetModeState(cm);
    }
    function resetModeState(cm) {
        cm.doc.iter(function(line) {
            if (line.stateAfter) line.stateAfter = null;
            if (line.styles) line.styles = null;
        });
        cm.doc.frontier = cm.doc.first;
        startWorker(cm, 100);
        cm.state.modeGen++;
        if (cm.curOp) regChange(cm);
    }
    function wrappingChanged(cm) {
        if (cm.options.lineWrapping) {
            addClass(cm.display.wrapper, "CodeMirror-wrap");
            cm.display.sizer.style.minWidth = "";
        } else {
            rmClass(cm.display.wrapper, "CodeMirror-wrap");
            findMaxLine(cm);
        }
        estimateLineHeights(cm);
        regChange(cm);
        clearCaches(cm);
        setTimeout(function() {
            updateScrollbars(cm);
        }, 100);
    }
    function estimateHeight(cm) {
        var th = textHeight(cm.display), wrapping = cm.options.lineWrapping;
        var perLine = wrapping && Math.max(5, cm.display.scroller.clientWidth / charWidth(cm.display) - 3);
        return function(line) {
            if (lineIsHidden(cm.doc, line)) return 0;
            var widgetsHeight = 0;
            if (line.widgets) for (var i = 0; i < line.widgets.length; i++) {
                if (line.widgets[i].height) widgetsHeight += line.widgets[i].height;
            }
            if (wrapping) return widgetsHeight + (Math.ceil(line.text.length / perLine) || 1) * th; else return widgetsHeight + th;
        };
    }
    function estimateLineHeights(cm) {
        var doc = cm.doc, est = estimateHeight(cm);
        doc.iter(function(line) {
            var estHeight = est(line);
            if (estHeight != line.height) updateLineHeight(line, estHeight);
        });
    }
    function themeChanged(cm) {
        cm.display.wrapper.className = cm.display.wrapper.className.replace(/\s*cm-s-\S+/g, "") + cm.options.theme.replace(/(^|\s)\s*/g, " cm-s-");
        clearCaches(cm);
    }
    function guttersChanged(cm) {
        updateGutters(cm);
        regChange(cm);
        setTimeout(function() {
            alignHorizontally(cm);
        }, 20);
    }
    function updateGutters(cm) {
        var gutters = cm.display.gutters, specs = cm.options.gutters;
        removeChildren(gutters);
        for (var i = 0; i < specs.length; ++i) {
            var gutterClass = specs[i];
            var gElt = gutters.appendChild(elt("div", null, "CodeMirror-gutter " + gutterClass));
            if (gutterClass == "CodeMirror-linenumbers") {
                cm.display.lineGutter = gElt;
                gElt.style.width = (cm.display.lineNumWidth || 1) + "px";
            }
        }
        gutters.style.display = i ? "" : "none";
        updateGutterSpace(cm);
    }
    function updateGutterSpace(cm) {
        var width = cm.display.gutters.offsetWidth;
        cm.display.sizer.style.marginLeft = width + "px";
        cm.display.scrollbarH.style.left = cm.options.fixedGutter ? width + "px" : 0;
    }
    function lineLength(line) {
        if (line.height == 0) return 0;
        var len = line.text.length, merged, cur = line;
        while (merged = collapsedSpanAtStart(cur)) {
            var found = merged.find(0, true);
            cur = found.from.line;
            len += found.from.ch - found.to.ch;
        }
        cur = line;
        while (merged = collapsedSpanAtEnd(cur)) {
            var found = merged.find(0, true);
            len -= cur.text.length - found.from.ch;
            cur = found.to.line;
            len += cur.text.length - found.to.ch;
        }
        return len;
    }
    function findMaxLine(cm) {
        var d = cm.display, doc = cm.doc;
        d.maxLine = getLine(doc, doc.first);
        d.maxLineLength = lineLength(d.maxLine);
        d.maxLineChanged = true;
        doc.iter(function(line) {
            var len = lineLength(line);
            if (len > d.maxLineLength) {
                d.maxLineLength = len;
                d.maxLine = line;
            }
        });
    }
    function setGuttersForLineNumbers(options) {
        var found = indexOf(options.gutters, "CodeMirror-linenumbers");
        if (found == -1 && options.lineNumbers) {
            options.gutters = options.gutters.concat([ "CodeMirror-linenumbers" ]);
        } else if (found > -1 && !options.lineNumbers) {
            options.gutters = options.gutters.slice(0);
            options.gutters.splice(found, 1);
        }
    }
    function hScrollbarTakesSpace(cm) {
        return cm.display.scroller.clientHeight - cm.display.wrapper.clientHeight < scrollerCutOff - 3;
    }
    function measureForScrollbars(cm) {
        var scroll = cm.display.scroller;
        return {
            clientHeight: scroll.clientHeight,
            barHeight: cm.display.scrollbarV.clientHeight,
            scrollWidth: scroll.scrollWidth,
            clientWidth: scroll.clientWidth,
            hScrollbarTakesSpace: hScrollbarTakesSpace(cm),
            barWidth: cm.display.scrollbarH.clientWidth,
            docHeight: Math.round(cm.doc.height + paddingVert(cm.display))
        };
    }
    function updateScrollbars(cm, measure) {
        if (!measure) measure = measureForScrollbars(cm);
        var d = cm.display, sWidth = scrollbarWidth(d.measure);
        var scrollHeight = measure.docHeight + scrollerCutOff;
        var needsH = measure.scrollWidth > measure.clientWidth;
        if (needsH && measure.scrollWidth <= measure.clientWidth + 1 && sWidth > 0 && !measure.hScrollbarTakesSpace) needsH = false;
        var needsV = scrollHeight > measure.clientHeight;
        if (needsV) {
            d.scrollbarV.style.display = "block";
            d.scrollbarV.style.bottom = needsH ? sWidth + "px" : "0";
            d.scrollbarV.firstChild.style.height = Math.max(0, scrollHeight - measure.clientHeight + (measure.barHeight || d.scrollbarV.clientHeight)) + "px";
        } else {
            d.scrollbarV.style.display = "";
            d.scrollbarV.firstChild.style.height = "0";
        }
        if (needsH) {
            d.scrollbarH.style.display = "block";
            d.scrollbarH.style.right = needsV ? sWidth + "px" : "0";
            d.scrollbarH.firstChild.style.width = measure.scrollWidth - measure.clientWidth + (measure.barWidth || d.scrollbarH.clientWidth) + "px";
        } else {
            d.scrollbarH.style.display = "";
            d.scrollbarH.firstChild.style.width = "0";
        }
        if (needsH && needsV) {
            d.scrollbarFiller.style.display = "block";
            d.scrollbarFiller.style.height = d.scrollbarFiller.style.width = sWidth + "px";
        } else d.scrollbarFiller.style.display = "";
        if (needsH && cm.options.coverGutterNextToScrollbar && cm.options.fixedGutter) {
            d.gutterFiller.style.display = "block";
            d.gutterFiller.style.height = sWidth + "px";
            d.gutterFiller.style.width = d.gutters.offsetWidth + "px";
        } else d.gutterFiller.style.display = "";
        if (!cm.state.checkedOverlayScrollbar && measure.clientHeight > 0) {
            if (sWidth === 0) {
                var w = mac && !mac_geMountainLion ? "12px" : "18px";
                d.scrollbarV.style.minWidth = d.scrollbarH.style.minHeight = w;
                var barMouseDown = function(e) {
                    if (e_target(e) != d.scrollbarV && e_target(e) != d.scrollbarH) operation(cm, onMouseDown)(e);
                };
                on(d.scrollbarV, "mousedown", barMouseDown);
                on(d.scrollbarH, "mousedown", barMouseDown);
            }
            cm.state.checkedOverlayScrollbar = true;
        }
    }
    function visibleLines(display, doc, viewport) {
        var top = viewport && viewport.top != null ? Math.max(0, viewport.top) : display.scroller.scrollTop;
        top = Math.floor(top - paddingTop(display));
        var bottom = viewport && viewport.bottom != null ? viewport.bottom : top + display.wrapper.clientHeight;
        var from = lineAtHeight(doc, top), to = lineAtHeight(doc, bottom);
        if (viewport && viewport.ensure) {
            var ensureFrom = viewport.ensure.from.line, ensureTo = viewport.ensure.to.line;
            if (ensureFrom < from) return {
                from: ensureFrom,
                to: lineAtHeight(doc, heightAtLine(getLine(doc, ensureFrom)) + display.wrapper.clientHeight)
            };
            if (Math.min(ensureTo, doc.lastLine()) >= to) return {
                from: lineAtHeight(doc, heightAtLine(getLine(doc, ensureTo)) - display.wrapper.clientHeight),
                to: ensureTo
            };
        }
        return {
            from: from,
            to: Math.max(to, from + 1)
        };
    }
    function alignHorizontally(cm) {
        var display = cm.display, view = display.view;
        if (!display.alignWidgets && (!display.gutters.firstChild || !cm.options.fixedGutter)) return;
        var comp = compensateForHScroll(display) - display.scroller.scrollLeft + cm.doc.scrollLeft;
        var gutterW = display.gutters.offsetWidth, left = comp + "px";
        for (var i = 0; i < view.length; i++) if (!view[i].hidden) {
            if (cm.options.fixedGutter && view[i].gutter) view[i].gutter.style.left = left;
            var align = view[i].alignable;
            if (align) for (var j = 0; j < align.length; j++) align[j].style.left = left;
        }
        if (cm.options.fixedGutter) display.gutters.style.left = comp + gutterW + "px";
    }
    function maybeUpdateLineNumberWidth(cm) {
        if (!cm.options.lineNumbers) return false;
        var doc = cm.doc, last = lineNumberFor(cm.options, doc.first + doc.size - 1), display = cm.display;
        if (last.length != display.lineNumChars) {
            var test = display.measure.appendChild(elt("div", [ elt("div", last) ], "CodeMirror-linenumber CodeMirror-gutter-elt"));
            var innerW = test.firstChild.offsetWidth, padding = test.offsetWidth - innerW;
            display.lineGutter.style.width = "";
            display.lineNumInnerWidth = Math.max(innerW, display.lineGutter.offsetWidth - padding);
            display.lineNumWidth = display.lineNumInnerWidth + padding;
            display.lineNumChars = display.lineNumInnerWidth ? last.length : -1;
            display.lineGutter.style.width = display.lineNumWidth + "px";
            updateGutterSpace(cm);
            return true;
        }
        return false;
    }
    function lineNumberFor(options, i) {
        return String(options.lineNumberFormatter(i + options.firstLineNumber));
    }
    function compensateForHScroll(display) {
        return display.scroller.getBoundingClientRect().left - display.sizer.getBoundingClientRect().left;
    }
    function DisplayUpdate(cm, viewport, force) {
        var display = cm.display;
        this.viewport = viewport;
        this.visible = visibleLines(display, cm.doc, viewport);
        this.editorIsHidden = !display.wrapper.offsetWidth;
        this.wrapperHeight = display.wrapper.clientHeight;
        this.wrapperWidth = display.wrapper.clientWidth;
        this.oldViewFrom = display.viewFrom;
        this.oldViewTo = display.viewTo;
        this.oldScrollerWidth = display.scroller.clientWidth;
        this.force = force;
        this.dims = getDimensions(cm);
    }
    function updateDisplayIfNeeded(cm, update) {
        var display = cm.display, doc = cm.doc;
        if (update.editorIsHidden) {
            resetView(cm);
            return false;
        }
        if (!update.force && update.visible.from >= display.viewFrom && update.visible.to <= display.viewTo && (display.updateLineNumbers == null || display.updateLineNumbers >= display.viewTo) && countDirtyView(cm) == 0) return false;
        if (maybeUpdateLineNumberWidth(cm)) {
            resetView(cm);
            update.dims = getDimensions(cm);
        }
        var end = doc.first + doc.size;
        var from = Math.max(update.visible.from - cm.options.viewportMargin, doc.first);
        var to = Math.min(end, update.visible.to + cm.options.viewportMargin);
        if (display.viewFrom < from && from - display.viewFrom < 20) from = Math.max(doc.first, display.viewFrom);
        if (display.viewTo > to && display.viewTo - to < 20) to = Math.min(end, display.viewTo);
        if (sawCollapsedSpans) {
            from = visualLineNo(cm.doc, from);
            to = visualLineEndNo(cm.doc, to);
        }
        var different = from != display.viewFrom || to != display.viewTo || display.lastWrapHeight != update.wrapperHeight || display.lastWrapWidth != update.wrapperWidth;
        adjustView(cm, from, to);
        display.viewOffset = heightAtLine(getLine(cm.doc, display.viewFrom));
        cm.display.mover.style.top = display.viewOffset + "px";
        var toUpdate = countDirtyView(cm);
        if (!different && toUpdate == 0 && !update.force && (display.updateLineNumbers == null || display.updateLineNumbers >= display.viewTo)) return false;
        var focused = activeElt();
        if (toUpdate > 4) display.lineDiv.style.display = "none";
        patchDisplay(cm, display.updateLineNumbers, update.dims);
        if (toUpdate > 4) display.lineDiv.style.display = "";
        if (focused && activeElt() != focused && focused.offsetHeight) focused.focus();
        removeChildren(display.cursorDiv);
        removeChildren(display.selectionDiv);
        if (different) {
            display.lastWrapHeight = update.wrapperHeight;
            display.lastWrapWidth = update.wrapperWidth;
            startWorker(cm, 400);
        }
        display.updateLineNumbers = null;
        return true;
    }
    function postUpdateDisplay(cm, update) {
        var force = update.force, viewport = update.viewport;
        for (var first = true; ;first = false) {
            if (first && cm.options.lineWrapping && update.oldScrollerWidth != cm.display.scroller.clientWidth) {
                force = true;
            } else {
                force = false;
                if (viewport && viewport.top != null) viewport = {
                    top: Math.min(cm.doc.height + paddingVert(cm.display) - scrollerCutOff - cm.display.scroller.clientHeight, viewport.top)
                };
                update.visible = visibleLines(cm.display, cm.doc, viewport);
                if (update.visible.from >= cm.display.viewFrom && update.visible.to <= cm.display.viewTo) break;
            }
            if (!updateDisplayIfNeeded(cm, update)) break;
            updateHeightsInViewport(cm);
            var barMeasure = measureForScrollbars(cm);
            updateSelection(cm);
            setDocumentHeight(cm, barMeasure);
            updateScrollbars(cm, barMeasure);
        }
        signalLater(cm, "update", cm);
        if (cm.display.viewFrom != update.oldViewFrom || cm.display.viewTo != update.oldViewTo) signalLater(cm, "viewportChange", cm, cm.display.viewFrom, cm.display.viewTo);
    }
    function updateDisplaySimple(cm, viewport) {
        var update = new DisplayUpdate(cm, viewport);
        if (updateDisplayIfNeeded(cm, update)) {
            updateHeightsInViewport(cm);
            postUpdateDisplay(cm, update);
            var barMeasure = measureForScrollbars(cm);
            updateSelection(cm);
            setDocumentHeight(cm, barMeasure);
            updateScrollbars(cm, barMeasure);
        }
    }
    function setDocumentHeight(cm, measure) {
        cm.display.sizer.style.minHeight = cm.display.heightForcer.style.top = measure.docHeight + "px";
        cm.display.gutters.style.height = Math.max(measure.docHeight, measure.clientHeight - scrollerCutOff) + "px";
    }
    function checkForWebkitWidthBug(cm, measure) {
        if (cm.display.sizer.offsetWidth + cm.display.gutters.offsetWidth < cm.display.scroller.clientWidth - 1) {
            cm.display.sizer.style.minHeight = cm.display.heightForcer.style.top = "0px";
            cm.display.gutters.style.height = measure.docHeight + "px";
        }
    }
    function updateHeightsInViewport(cm) {
        var display = cm.display;
        var prevBottom = display.lineDiv.offsetTop;
        for (var i = 0; i < display.view.length; i++) {
            var cur = display.view[i], height;
            if (cur.hidden) continue;
            if (ie && ie_version < 8) {
                var bot = cur.node.offsetTop + cur.node.offsetHeight;
                height = bot - prevBottom;
                prevBottom = bot;
            } else {
                var box = cur.node.getBoundingClientRect();
                height = box.bottom - box.top;
            }
            var diff = cur.line.height - height;
            if (height < 2) height = textHeight(display);
            if (diff > .001 || diff < -.001) {
                updateLineHeight(cur.line, height);
                updateWidgetHeight(cur.line);
                if (cur.rest) for (var j = 0; j < cur.rest.length; j++) updateWidgetHeight(cur.rest[j]);
            }
        }
    }
    function updateWidgetHeight(line) {
        if (line.widgets) for (var i = 0; i < line.widgets.length; ++i) line.widgets[i].height = line.widgets[i].node.offsetHeight;
    }
    function getDimensions(cm) {
        var d = cm.display, left = {}, width = {};
        var gutterLeft = d.gutters.clientLeft;
        for (var n = d.gutters.firstChild, i = 0; n; n = n.nextSibling, ++i) {
            left[cm.options.gutters[i]] = n.offsetLeft + n.clientLeft + gutterLeft;
            width[cm.options.gutters[i]] = n.clientWidth;
        }
        return {
            fixedPos: compensateForHScroll(d),
            gutterTotalWidth: d.gutters.offsetWidth,
            gutterLeft: left,
            gutterWidth: width,
            wrapperWidth: d.wrapper.clientWidth
        };
    }
    function patchDisplay(cm, updateNumbersFrom, dims) {
        var display = cm.display, lineNumbers = cm.options.lineNumbers;
        var container = display.lineDiv, cur = container.firstChild;
        function rm(node) {
            var next = node.nextSibling;
            if (webkit && mac && cm.display.currentWheelTarget == node) node.style.display = "none"; else node.parentNode.removeChild(node);
            return next;
        }
        var view = display.view, lineN = display.viewFrom;
        for (var i = 0; i < view.length; i++) {
            var lineView = view[i];
            if (lineView.hidden) {} else if (!lineView.node) {
                var node = buildLineElement(cm, lineView, lineN, dims);
                container.insertBefore(node, cur);
            } else {
                while (cur != lineView.node) cur = rm(cur);
                var updateNumber = lineNumbers && updateNumbersFrom != null && updateNumbersFrom <= lineN && lineView.lineNumber;
                if (lineView.changes) {
                    if (indexOf(lineView.changes, "gutter") > -1) updateNumber = false;
                    updateLineForChanges(cm, lineView, lineN, dims);
                }
                if (updateNumber) {
                    removeChildren(lineView.lineNumber);
                    lineView.lineNumber.appendChild(document.createTextNode(lineNumberFor(cm.options, lineN)));
                }
                cur = lineView.node.nextSibling;
            }
            lineN += lineView.size;
        }
        while (cur) cur = rm(cur);
    }
    function updateLineForChanges(cm, lineView, lineN, dims) {
        for (var j = 0; j < lineView.changes.length; j++) {
            var type = lineView.changes[j];
            if (type == "text") updateLineText(cm, lineView); else if (type == "gutter") updateLineGutter(cm, lineView, lineN, dims); else if (type == "class") updateLineClasses(lineView); else if (type == "widget") updateLineWidgets(lineView, dims);
        }
        lineView.changes = null;
    }
    function ensureLineWrapped(lineView) {
        if (lineView.node == lineView.text) {
            lineView.node = elt("div", null, null, "position: relative");
            if (lineView.text.parentNode) lineView.text.parentNode.replaceChild(lineView.node, lineView.text);
            lineView.node.appendChild(lineView.text);
            if (ie && ie_version < 8) lineView.node.style.zIndex = 2;
        }
        return lineView.node;
    }
    function updateLineBackground(lineView) {
        var cls = lineView.bgClass ? lineView.bgClass + " " + (lineView.line.bgClass || "") : lineView.line.bgClass;
        if (cls) cls += " CodeMirror-linebackground";
        if (lineView.background) {
            if (cls) lineView.background.className = cls; else {
                lineView.background.parentNode.removeChild(lineView.background);
                lineView.background = null;
            }
        } else if (cls) {
            var wrap = ensureLineWrapped(lineView);
            lineView.background = wrap.insertBefore(elt("div", null, cls), wrap.firstChild);
        }
    }
    function getLineContent(cm, lineView) {
        var ext = cm.display.externalMeasured;
        if (ext && ext.line == lineView.line) {
            cm.display.externalMeasured = null;
            lineView.measure = ext.measure;
            return ext.built;
        }
        return buildLineContent(cm, lineView);
    }
    function updateLineText(cm, lineView) {
        var cls = lineView.text.className;
        var built = getLineContent(cm, lineView);
        if (lineView.text == lineView.node) lineView.node = built.pre;
        lineView.text.parentNode.replaceChild(built.pre, lineView.text);
        lineView.text = built.pre;
        if (built.bgClass != lineView.bgClass || built.textClass != lineView.textClass) {
            lineView.bgClass = built.bgClass;
            lineView.textClass = built.textClass;
            updateLineClasses(lineView);
        } else if (cls) {
            lineView.text.className = cls;
        }
    }
    function updateLineClasses(lineView) {
        updateLineBackground(lineView);
        if (lineView.line.wrapClass) ensureLineWrapped(lineView).className = lineView.line.wrapClass; else if (lineView.node != lineView.text) lineView.node.className = "";
        var textClass = lineView.textClass ? lineView.textClass + " " + (lineView.line.textClass || "") : lineView.line.textClass;
        lineView.text.className = textClass || "";
    }
    function updateLineGutter(cm, lineView, lineN, dims) {
        if (lineView.gutter) {
            lineView.node.removeChild(lineView.gutter);
            lineView.gutter = null;
        }
        var markers = lineView.line.gutterMarkers;
        if (cm.options.lineNumbers || markers) {
            var wrap = ensureLineWrapped(lineView);
            var gutterWrap = lineView.gutter = wrap.insertBefore(elt("div", null, "CodeMirror-gutter-wrapper", "left: " + (cm.options.fixedGutter ? dims.fixedPos : -dims.gutterTotalWidth) + "px; width: " + dims.gutterTotalWidth + "px"), lineView.text);
            if (lineView.line.gutterClass) gutterWrap.className += " " + lineView.line.gutterClass;
            if (cm.options.lineNumbers && (!markers || !markers["CodeMirror-linenumbers"])) lineView.lineNumber = gutterWrap.appendChild(elt("div", lineNumberFor(cm.options, lineN), "CodeMirror-linenumber CodeMirror-gutter-elt", "left: " + dims.gutterLeft["CodeMirror-linenumbers"] + "px; width: " + cm.display.lineNumInnerWidth + "px"));
            if (markers) for (var k = 0; k < cm.options.gutters.length; ++k) {
                var id = cm.options.gutters[k], found = markers.hasOwnProperty(id) && markers[id];
                if (found) gutterWrap.appendChild(elt("div", [ found ], "CodeMirror-gutter-elt", "left: " + dims.gutterLeft[id] + "px; width: " + dims.gutterWidth[id] + "px"));
            }
        }
    }
    function updateLineWidgets(lineView, dims) {
        if (lineView.alignable) lineView.alignable = null;
        for (var node = lineView.node.firstChild, next; node; node = next) {
            var next = node.nextSibling;
            if (node.className == "CodeMirror-linewidget") lineView.node.removeChild(node);
        }
        insertLineWidgets(lineView, dims);
    }
    function buildLineElement(cm, lineView, lineN, dims) {
        var built = getLineContent(cm, lineView);
        lineView.text = lineView.node = built.pre;
        if (built.bgClass) lineView.bgClass = built.bgClass;
        if (built.textClass) lineView.textClass = built.textClass;
        updateLineClasses(lineView);
        updateLineGutter(cm, lineView, lineN, dims);
        insertLineWidgets(lineView, dims);
        return lineView.node;
    }
    function insertLineWidgets(lineView, dims) {
        insertLineWidgetsFor(lineView.line, lineView, dims, true);
        if (lineView.rest) for (var i = 0; i < lineView.rest.length; i++) insertLineWidgetsFor(lineView.rest[i], lineView, dims, false);
    }
    function insertLineWidgetsFor(line, lineView, dims, allowAbove) {
        if (!line.widgets) return;
        var wrap = ensureLineWrapped(lineView);
        for (var i = 0, ws = line.widgets; i < ws.length; ++i) {
            var widget = ws[i], node = elt("div", [ widget.node ], "CodeMirror-linewidget");
            if (!widget.handleMouseEvents) node.ignoreEvents = true;
            positionLineWidget(widget, node, lineView, dims);
            if (allowAbove && widget.above) wrap.insertBefore(node, lineView.gutter || lineView.text); else wrap.appendChild(node);
            signalLater(widget, "redraw");
        }
    }
    function positionLineWidget(widget, node, lineView, dims) {
        if (widget.noHScroll) {
            (lineView.alignable || (lineView.alignable = [])).push(node);
            var width = dims.wrapperWidth;
            node.style.left = dims.fixedPos + "px";
            if (!widget.coverGutter) {
                width -= dims.gutterTotalWidth;
                node.style.paddingLeft = dims.gutterTotalWidth + "px";
            }
            node.style.width = width + "px";
        }
        if (widget.coverGutter) {
            node.style.zIndex = 5;
            node.style.position = "relative";
            if (!widget.noHScroll) node.style.marginLeft = -dims.gutterTotalWidth + "px";
        }
    }
    var Pos = CodeMirror.Pos = function(line, ch) {
        if (!(this instanceof Pos)) return new Pos(line, ch);
        this.line = line;
        this.ch = ch;
    };
    var cmp = CodeMirror.cmpPos = function(a, b) {
        return a.line - b.line || a.ch - b.ch;
    };
    function copyPos(x) {
        return Pos(x.line, x.ch);
    }
    function maxPos(a, b) {
        return cmp(a, b) < 0 ? b : a;
    }
    function minPos(a, b) {
        return cmp(a, b) < 0 ? a : b;
    }
    function Selection(ranges, primIndex) {
        this.ranges = ranges;
        this.primIndex = primIndex;
    }
    Selection.prototype = {
        primary: function() {
            return this.ranges[this.primIndex];
        },
        equals: function(other) {
            if (other == this) return true;
            if (other.primIndex != this.primIndex || other.ranges.length != this.ranges.length) return false;
            for (var i = 0; i < this.ranges.length; i++) {
                var here = this.ranges[i], there = other.ranges[i];
                if (cmp(here.anchor, there.anchor) != 0 || cmp(here.head, there.head) != 0) return false;
            }
            return true;
        },
        deepCopy: function() {
            for (var out = [], i = 0; i < this.ranges.length; i++) out[i] = new Range(copyPos(this.ranges[i].anchor), copyPos(this.ranges[i].head));
            return new Selection(out, this.primIndex);
        },
        somethingSelected: function() {
            for (var i = 0; i < this.ranges.length; i++) if (!this.ranges[i].empty()) return true;
            return false;
        },
        contains: function(pos, end) {
            if (!end) end = pos;
            for (var i = 0; i < this.ranges.length; i++) {
                var range = this.ranges[i];
                if (cmp(end, range.from()) >= 0 && cmp(pos, range.to()) <= 0) return i;
            }
            return -1;
        }
    };
    function Range(anchor, head) {
        this.anchor = anchor;
        this.head = head;
    }
    Range.prototype = {
        from: function() {
            return minPos(this.anchor, this.head);
        },
        to: function() {
            return maxPos(this.anchor, this.head);
        },
        empty: function() {
            return this.head.line == this.anchor.line && this.head.ch == this.anchor.ch;
        }
    };
    function normalizeSelection(ranges, primIndex) {
        var prim = ranges[primIndex];
        ranges.sort(function(a, b) {
            return cmp(a.from(), b.from());
        });
        primIndex = indexOf(ranges, prim);
        for (var i = 1; i < ranges.length; i++) {
            var cur = ranges[i], prev = ranges[i - 1];
            if (cmp(prev.to(), cur.from()) >= 0) {
                var from = minPos(prev.from(), cur.from()), to = maxPos(prev.to(), cur.to());
                var inv = prev.empty() ? cur.from() == cur.head : prev.from() == prev.head;
                if (i <= primIndex) --primIndex;
                ranges.splice(--i, 2, new Range(inv ? to : from, inv ? from : to));
            }
        }
        return new Selection(ranges, primIndex);
    }
    function simpleSelection(anchor, head) {
        return new Selection([ new Range(anchor, head || anchor) ], 0);
    }
    function clipLine(doc, n) {
        return Math.max(doc.first, Math.min(n, doc.first + doc.size - 1));
    }
    function clipPos(doc, pos) {
        if (pos.line < doc.first) return Pos(doc.first, 0);
        var last = doc.first + doc.size - 1;
        if (pos.line > last) return Pos(last, getLine(doc, last).text.length);
        return clipToLen(pos, getLine(doc, pos.line).text.length);
    }
    function clipToLen(pos, linelen) {
        var ch = pos.ch;
        if (ch == null || ch > linelen) return Pos(pos.line, linelen); else if (ch < 0) return Pos(pos.line, 0); else return pos;
    }
    function isLine(doc, l) {
        return l >= doc.first && l < doc.first + doc.size;
    }
    function clipPosArray(doc, array) {
        for (var out = [], i = 0; i < array.length; i++) out[i] = clipPos(doc, array[i]);
        return out;
    }
    function extendRange(doc, range, head, other) {
        if (doc.cm && doc.cm.display.shift || doc.extend) {
            var anchor = range.anchor;
            if (other) {
                var posBefore = cmp(head, anchor) < 0;
                if (posBefore != cmp(other, anchor) < 0) {
                    anchor = head;
                    head = other;
                } else if (posBefore != cmp(head, other) < 0) {
                    head = other;
                }
            }
            return new Range(anchor, head);
        } else {
            return new Range(other || head, head);
        }
    }
    function extendSelection(doc, head, other, options) {
        setSelection(doc, new Selection([ extendRange(doc, doc.sel.primary(), head, other) ], 0), options);
    }
    function extendSelections(doc, heads, options) {
        for (var out = [], i = 0; i < doc.sel.ranges.length; i++) out[i] = extendRange(doc, doc.sel.ranges[i], heads[i], null);
        var newSel = normalizeSelection(out, doc.sel.primIndex);
        setSelection(doc, newSel, options);
    }
    function replaceOneSelection(doc, i, range, options) {
        var ranges = doc.sel.ranges.slice(0);
        ranges[i] = range;
        setSelection(doc, normalizeSelection(ranges, doc.sel.primIndex), options);
    }
    function setSimpleSelection(doc, anchor, head, options) {
        setSelection(doc, simpleSelection(anchor, head), options);
    }
    function filterSelectionChange(doc, sel) {
        var obj = {
            ranges: sel.ranges,
            update: function(ranges) {
                this.ranges = [];
                for (var i = 0; i < ranges.length; i++) this.ranges[i] = new Range(clipPos(doc, ranges[i].anchor), clipPos(doc, ranges[i].head));
            }
        };
        signal(doc, "beforeSelectionChange", doc, obj);
        if (doc.cm) signal(doc.cm, "beforeSelectionChange", doc.cm, obj);
        if (obj.ranges != sel.ranges) return normalizeSelection(obj.ranges, obj.ranges.length - 1); else return sel;
    }
    function setSelectionReplaceHistory(doc, sel, options) {
        var done = doc.history.done, last = lst(done);
        if (last && last.ranges) {
            done[done.length - 1] = sel;
            setSelectionNoUndo(doc, sel, options);
        } else {
            setSelection(doc, sel, options);
        }
    }
    function setSelection(doc, sel, options) {
        setSelectionNoUndo(doc, sel, options);
        addSelectionToHistory(doc, doc.sel, doc.cm ? doc.cm.curOp.id : NaN, options);
    }
    function setSelectionNoUndo(doc, sel, options) {
        if (hasHandler(doc, "beforeSelectionChange") || doc.cm && hasHandler(doc.cm, "beforeSelectionChange")) sel = filterSelectionChange(doc, sel);
        var bias = options && options.bias || (cmp(sel.primary().head, doc.sel.primary().head) < 0 ? -1 : 1);
        setSelectionInner(doc, skipAtomicInSelection(doc, sel, bias, true));
        if (!(options && options.scroll === false) && doc.cm) ensureCursorVisible(doc.cm);
    }
    function setSelectionInner(doc, sel) {
        if (sel.equals(doc.sel)) return;
        doc.sel = sel;
        if (doc.cm) {
            doc.cm.curOp.updateInput = doc.cm.curOp.selectionChanged = true;
            signalCursorActivity(doc.cm);
        }
        signalLater(doc, "cursorActivity", doc);
    }
    function reCheckSelection(doc) {
        setSelectionInner(doc, skipAtomicInSelection(doc, doc.sel, null, false), sel_dontScroll);
    }
    function skipAtomicInSelection(doc, sel, bias, mayClear) {
        var out;
        for (var i = 0; i < sel.ranges.length; i++) {
            var range = sel.ranges[i];
            var newAnchor = skipAtomic(doc, range.anchor, bias, mayClear);
            var newHead = skipAtomic(doc, range.head, bias, mayClear);
            if (out || newAnchor != range.anchor || newHead != range.head) {
                if (!out) out = sel.ranges.slice(0, i);
                out[i] = new Range(newAnchor, newHead);
            }
        }
        return out ? normalizeSelection(out, sel.primIndex) : sel;
    }
    function skipAtomic(doc, pos, bias, mayClear) {
        var flipped = false, curPos = pos;
        var dir = bias || 1;
        doc.cantEdit = false;
        search: for (;;) {
            var line = getLine(doc, curPos.line);
            if (line.markedSpans) {
                for (var i = 0; i < line.markedSpans.length; ++i) {
                    var sp = line.markedSpans[i], m = sp.marker;
                    if ((sp.from == null || (m.inclusiveLeft ? sp.from <= curPos.ch : sp.from < curPos.ch)) && (sp.to == null || (m.inclusiveRight ? sp.to >= curPos.ch : sp.to > curPos.ch))) {
                        if (mayClear) {
                            signal(m, "beforeCursorEnter");
                            if (m.explicitlyCleared) {
                                if (!line.markedSpans) break; else {
                                    --i;
                                    continue;
                                }
                            }
                        }
                        if (!m.atomic) continue;
                        var newPos = m.find(dir < 0 ? -1 : 1);
                        if (cmp(newPos, curPos) == 0) {
                            newPos.ch += dir;
                            if (newPos.ch < 0) {
                                if (newPos.line > doc.first) newPos = clipPos(doc, Pos(newPos.line - 1)); else newPos = null;
                            } else if (newPos.ch > line.text.length) {
                                if (newPos.line < doc.first + doc.size - 1) newPos = Pos(newPos.line + 1, 0); else newPos = null;
                            }
                            if (!newPos) {
                                if (flipped) {
                                    if (!mayClear) return skipAtomic(doc, pos, bias, true);
                                    doc.cantEdit = true;
                                    return Pos(doc.first, 0);
                                }
                                flipped = true;
                                newPos = pos;
                                dir = -dir;
                            }
                        }
                        curPos = newPos;
                        continue search;
                    }
                }
            }
            return curPos;
        }
    }
    function drawSelection(cm) {
        var display = cm.display, doc = cm.doc, result = {};
        var curFragment = result.cursors = document.createDocumentFragment();
        var selFragment = result.selection = document.createDocumentFragment();
        for (var i = 0; i < doc.sel.ranges.length; i++) {
            var range = doc.sel.ranges[i];
            var collapsed = range.empty();
            if (collapsed || cm.options.showCursorWhenSelecting) drawSelectionCursor(cm, range, curFragment);
            if (!collapsed) drawSelectionRange(cm, range, selFragment);
        }
        if (cm.options.moveInputWithCursor) {
            var headPos = cursorCoords(cm, doc.sel.primary().head, "div");
            var wrapOff = display.wrapper.getBoundingClientRect(), lineOff = display.lineDiv.getBoundingClientRect();
            result.teTop = Math.max(0, Math.min(display.wrapper.clientHeight - 10, headPos.top + lineOff.top - wrapOff.top));
            result.teLeft = Math.max(0, Math.min(display.wrapper.clientWidth - 10, headPos.left + lineOff.left - wrapOff.left));
        }
        return result;
    }
    function showSelection(cm, drawn) {
        removeChildrenAndAdd(cm.display.cursorDiv, drawn.cursors);
        removeChildrenAndAdd(cm.display.selectionDiv, drawn.selection);
        if (drawn.teTop != null) {
            cm.display.inputDiv.style.top = drawn.teTop + "px";
            cm.display.inputDiv.style.left = drawn.teLeft + "px";
        }
    }
    function updateSelection(cm) {
        showSelection(cm, drawSelection(cm));
    }
    function drawSelectionCursor(cm, range, output) {
        var pos = cursorCoords(cm, range.head, "div", null, null, !cm.options.singleCursorHeightPerLine);
        var cursor = output.appendChild(elt("div", " ", "CodeMirror-cursor"));
        cursor.style.left = pos.left + "px";
        cursor.style.top = pos.top + "px";
        cursor.style.height = Math.max(0, pos.bottom - pos.top) * cm.options.cursorHeight + "px";
        if (pos.other) {
            var otherCursor = output.appendChild(elt("div", " ", "CodeMirror-cursor CodeMirror-secondarycursor"));
            otherCursor.style.display = "";
            otherCursor.style.left = pos.other.left + "px";
            otherCursor.style.top = pos.other.top + "px";
            otherCursor.style.height = (pos.other.bottom - pos.other.top) * .85 + "px";
        }
    }
    function drawSelectionRange(cm, range, output) {
        var display = cm.display, doc = cm.doc;
        var fragment = document.createDocumentFragment();
        var padding = paddingH(cm.display), leftSide = padding.left, rightSide = display.lineSpace.offsetWidth - padding.right;
        function add(left, top, width, bottom) {
            if (top < 0) top = 0;
            top = Math.round(top);
            bottom = Math.round(bottom);
            fragment.appendChild(elt("div", null, "CodeMirror-selected", "position: absolute; left: " + left + "px; top: " + top + "px; width: " + (width == null ? rightSide - left : width) + "px; height: " + (bottom - top) + "px"));
        }
        function drawForLine(line, fromArg, toArg) {
            var lineObj = getLine(doc, line);
            var lineLen = lineObj.text.length;
            var start, end;
            function coords(ch, bias) {
                return charCoords(cm, Pos(line, ch), "div", lineObj, bias);
            }
            iterateBidiSections(getOrder(lineObj), fromArg || 0, toArg == null ? lineLen : toArg, function(from, to, dir) {
                var leftPos = coords(from, "left"), rightPos, left, right;
                if (from == to) {
                    rightPos = leftPos;
                    left = right = leftPos.left;
                } else {
                    rightPos = coords(to - 1, "right");
                    if (dir == "rtl") {
                        var tmp = leftPos;
                        leftPos = rightPos;
                        rightPos = tmp;
                    }
                    left = leftPos.left;
                    right = rightPos.right;
                }
                if (fromArg == null && from == 0) left = leftSide;
                if (rightPos.top - leftPos.top > 3) {
                    add(left, leftPos.top, null, leftPos.bottom);
                    left = leftSide;
                    if (leftPos.bottom < rightPos.top) add(left, leftPos.bottom, null, rightPos.top);
                }
                if (toArg == null && to == lineLen) right = rightSide;
                if (!start || leftPos.top < start.top || leftPos.top == start.top && leftPos.left < start.left) start = leftPos;
                if (!end || rightPos.bottom > end.bottom || rightPos.bottom == end.bottom && rightPos.right > end.right) end = rightPos;
                if (left < leftSide + 1) left = leftSide;
                add(left, rightPos.top, right - left, rightPos.bottom);
            });
            return {
                start: start,
                end: end
            };
        }
        var sFrom = range.from(), sTo = range.to();
        if (sFrom.line == sTo.line) {
            drawForLine(sFrom.line, sFrom.ch, sTo.ch);
        } else {
            var fromLine = getLine(doc, sFrom.line), toLine = getLine(doc, sTo.line);
            var singleVLine = visualLine(fromLine) == visualLine(toLine);
            var leftEnd = drawForLine(sFrom.line, sFrom.ch, singleVLine ? fromLine.text.length + 1 : null).end;
            var rightStart = drawForLine(sTo.line, singleVLine ? 0 : null, sTo.ch).start;
            if (singleVLine) {
                if (leftEnd.top < rightStart.top - 2) {
                    add(leftEnd.right, leftEnd.top, null, leftEnd.bottom);
                    add(leftSide, rightStart.top, rightStart.left, rightStart.bottom);
                } else {
                    add(leftEnd.right, leftEnd.top, rightStart.left - leftEnd.right, leftEnd.bottom);
                }
            }
            if (leftEnd.bottom < rightStart.top) add(leftSide, leftEnd.bottom, null, rightStart.top);
        }
        output.appendChild(fragment);
    }
    function restartBlink(cm) {
        if (!cm.state.focused) return;
        var display = cm.display;
        clearInterval(display.blinker);
        var on = true;
        display.cursorDiv.style.visibility = "";
        if (cm.options.cursorBlinkRate > 0) display.blinker = setInterval(function() {
            display.cursorDiv.style.visibility = (on = !on) ? "" : "hidden";
        }, cm.options.cursorBlinkRate); else if (cm.options.cursorBlinkRate < 0) display.cursorDiv.style.visibility = "hidden";
    }
    function startWorker(cm, time) {
        if (cm.doc.mode.startState && cm.doc.frontier < cm.display.viewTo) cm.state.highlight.set(time, bind(highlightWorker, cm));
    }
    function highlightWorker(cm) {
        var doc = cm.doc;
        if (doc.frontier < doc.first) doc.frontier = doc.first;
        if (doc.frontier >= cm.display.viewTo) return;
        var end = +new Date() + cm.options.workTime;
        var state = copyState(doc.mode, getStateBefore(cm, doc.frontier));
        var changedLines = [];
        doc.iter(doc.frontier, Math.min(doc.first + doc.size, cm.display.viewTo + 500), function(line) {
            if (doc.frontier >= cm.display.viewFrom) {
                var oldStyles = line.styles;
                var highlighted = highlightLine(cm, line, state, true);
                line.styles = highlighted.styles;
                var oldCls = line.styleClasses, newCls = highlighted.classes;
                if (newCls) line.styleClasses = newCls; else if (oldCls) line.styleClasses = null;
                var ischange = !oldStyles || oldStyles.length != line.styles.length || oldCls != newCls && (!oldCls || !newCls || oldCls.bgClass != newCls.bgClass || oldCls.textClass != newCls.textClass);
                for (var i = 0; !ischange && i < oldStyles.length; ++i) ischange = oldStyles[i] != line.styles[i];
                if (ischange) changedLines.push(doc.frontier);
                line.stateAfter = copyState(doc.mode, state);
            } else {
                processLine(cm, line.text, state);
                line.stateAfter = doc.frontier % 5 == 0 ? copyState(doc.mode, state) : null;
            }
            ++doc.frontier;
            if (+new Date() > end) {
                startWorker(cm, cm.options.workDelay);
                return true;
            }
        });
        if (changedLines.length) runInOp(cm, function() {
            for (var i = 0; i < changedLines.length; i++) regLineChange(cm, changedLines[i], "text");
        });
    }
    function findStartLine(cm, n, precise) {
        var minindent, minline, doc = cm.doc;
        var lim = precise ? -1 : n - (cm.doc.mode.innerMode ? 1e3 : 100);
        for (var search = n; search > lim; --search) {
            if (search <= doc.first) return doc.first;
            var line = getLine(doc, search - 1);
            if (line.stateAfter && (!precise || search <= doc.frontier)) return search;
            var indented = countColumn(line.text, null, cm.options.tabSize);
            if (minline == null || minindent > indented) {
                minline = search - 1;
                minindent = indented;
            }
        }
        return minline;
    }
    function getStateBefore(cm, n, precise) {
        var doc = cm.doc, display = cm.display;
        if (!doc.mode.startState) return true;
        var pos = findStartLine(cm, n, precise), state = pos > doc.first && getLine(doc, pos - 1).stateAfter;
        if (!state) state = startState(doc.mode); else state = copyState(doc.mode, state);
        doc.iter(pos, n, function(line) {
            processLine(cm, line.text, state);
            var save = pos == n - 1 || pos % 5 == 0 || pos >= display.viewFrom && pos < display.viewTo;
            line.stateAfter = save ? copyState(doc.mode, state) : null;
            ++pos;
        });
        if (precise) doc.frontier = pos;
        return state;
    }
    function paddingTop(display) {
        return display.lineSpace.offsetTop;
    }
    function paddingVert(display) {
        return display.mover.offsetHeight - display.lineSpace.offsetHeight;
    }
    function paddingH(display) {
        if (display.cachedPaddingH) return display.cachedPaddingH;
        var e = removeChildrenAndAdd(display.measure, elt("pre", "x"));
        var style = window.getComputedStyle ? window.getComputedStyle(e) : e.currentStyle;
        var data = {
            left: parseInt(style.paddingLeft),
            right: parseInt(style.paddingRight)
        };
        if (!isNaN(data.left) && !isNaN(data.right)) display.cachedPaddingH = data;
        return data;
    }
    function ensureLineHeights(cm, lineView, rect) {
        var wrapping = cm.options.lineWrapping;
        var curWidth = wrapping && cm.display.scroller.clientWidth;
        if (!lineView.measure.heights || wrapping && lineView.measure.width != curWidth) {
            var heights = lineView.measure.heights = [];
            if (wrapping) {
                lineView.measure.width = curWidth;
                var rects = lineView.text.firstChild.getClientRects();
                for (var i = 0; i < rects.length - 1; i++) {
                    var cur = rects[i], next = rects[i + 1];
                    if (Math.abs(cur.bottom - next.bottom) > 2) heights.push((cur.bottom + next.top) / 2 - rect.top);
                }
            }
            heights.push(rect.bottom - rect.top);
        }
    }
    function mapFromLineView(lineView, line, lineN) {
        if (lineView.line == line) return {
            map: lineView.measure.map,
            cache: lineView.measure.cache
        };
        for (var i = 0; i < lineView.rest.length; i++) if (lineView.rest[i] == line) return {
            map: lineView.measure.maps[i],
            cache: lineView.measure.caches[i]
        };
        for (var i = 0; i < lineView.rest.length; i++) if (lineNo(lineView.rest[i]) > lineN) return {
            map: lineView.measure.maps[i],
            cache: lineView.measure.caches[i],
            before: true
        };
    }
    function updateExternalMeasurement(cm, line) {
        line = visualLine(line);
        var lineN = lineNo(line);
        var view = cm.display.externalMeasured = new LineView(cm.doc, line, lineN);
        view.lineN = lineN;
        var built = view.built = buildLineContent(cm, view);
        view.text = built.pre;
        removeChildrenAndAdd(cm.display.lineMeasure, built.pre);
        return view;
    }
    function measureChar(cm, line, ch, bias) {
        return measureCharPrepared(cm, prepareMeasureForLine(cm, line), ch, bias);
    }
    function findViewForLine(cm, lineN) {
        if (lineN >= cm.display.viewFrom && lineN < cm.display.viewTo) return cm.display.view[findViewIndex(cm, lineN)];
        var ext = cm.display.externalMeasured;
        if (ext && lineN >= ext.lineN && lineN < ext.lineN + ext.size) return ext;
    }
    function prepareMeasureForLine(cm, line) {
        var lineN = lineNo(line);
        var view = findViewForLine(cm, lineN);
        if (view && !view.text) view = null; else if (view && view.changes) updateLineForChanges(cm, view, lineN, getDimensions(cm));
        if (!view) view = updateExternalMeasurement(cm, line);
        var info = mapFromLineView(view, line, lineN);
        return {
            line: line,
            view: view,
            rect: null,
            map: info.map,
            cache: info.cache,
            before: info.before,
            hasHeights: false
        };
    }
    function measureCharPrepared(cm, prepared, ch, bias, varHeight) {
        if (prepared.before) ch = -1;
        var key = ch + (bias || ""), found;
        if (prepared.cache.hasOwnProperty(key)) {
            found = prepared.cache[key];
        } else {
            if (!prepared.rect) prepared.rect = prepared.view.text.getBoundingClientRect();
            if (!prepared.hasHeights) {
                ensureLineHeights(cm, prepared.view, prepared.rect);
                prepared.hasHeights = true;
            }
            found = measureCharInner(cm, prepared, ch, bias);
            if (!found.bogus) prepared.cache[key] = found;
        }
        return {
            left: found.left,
            right: found.right,
            top: varHeight ? found.rtop : found.top,
            bottom: varHeight ? found.rbottom : found.bottom
        };
    }
    var nullRect = {
        left: 0,
        right: 0,
        top: 0,
        bottom: 0
    };
    function measureCharInner(cm, prepared, ch, bias) {
        var map = prepared.map;
        var node, start, end, collapse;
        for (var i = 0; i < map.length; i += 3) {
            var mStart = map[i], mEnd = map[i + 1];
            if (ch < mStart) {
                start = 0;
                end = 1;
                collapse = "left";
            } else if (ch < mEnd) {
                start = ch - mStart;
                end = start + 1;
            } else if (i == map.length - 3 || ch == mEnd && map[i + 3] > ch) {
                end = mEnd - mStart;
                start = end - 1;
                if (ch >= mEnd) collapse = "right";
            }
            if (start != null) {
                node = map[i + 2];
                if (mStart == mEnd && bias == (node.insertLeft ? "left" : "right")) collapse = bias;
                if (bias == "left" && start == 0) while (i && map[i - 2] == map[i - 3] && map[i - 1].insertLeft) {
                    node = map[(i -= 3) + 2];
                    collapse = "left";
                }
                if (bias == "right" && start == mEnd - mStart) while (i < map.length - 3 && map[i + 3] == map[i + 4] && !map[i + 5].insertLeft) {
                    node = map[(i += 3) + 2];
                    collapse = "right";
                }
                break;
            }
        }
        var rect;
        if (node.nodeType == 3) {
            for (var i = 0; i < 4; i++) {
                while (start && isExtendingChar(prepared.line.text.charAt(mStart + start))) --start;
                while (mStart + end < mEnd && isExtendingChar(prepared.line.text.charAt(mStart + end))) ++end;
                if (ie && ie_version < 9 && start == 0 && end == mEnd - mStart) {
                    rect = node.parentNode.getBoundingClientRect();
                } else if (ie && cm.options.lineWrapping) {
                    var rects = range(node, start, end).getClientRects();
                    if (rects.length) rect = rects[bias == "right" ? rects.length - 1 : 0]; else rect = nullRect;
                } else {
                    rect = range(node, start, end).getBoundingClientRect() || nullRect;
                }
                if (rect.left || rect.right || start == 0) break;
                end = start;
                start = start - 1;
                collapse = "right";
            }
            if (ie && ie_version < 11) rect = maybeUpdateRectForZooming(cm.display.measure, rect);
        } else {
            if (start > 0) collapse = bias = "right";
            var rects;
            if (cm.options.lineWrapping && (rects = node.getClientRects()).length > 1) rect = rects[bias == "right" ? rects.length - 1 : 0]; else rect = node.getBoundingClientRect();
        }
        if (ie && ie_version < 9 && !start && (!rect || !rect.left && !rect.right)) {
            var rSpan = node.parentNode.getClientRects()[0];
            if (rSpan) rect = {
                left: rSpan.left,
                right: rSpan.left + charWidth(cm.display),
                top: rSpan.top,
                bottom: rSpan.bottom
            }; else rect = nullRect;
        }
        var rtop = rect.top - prepared.rect.top, rbot = rect.bottom - prepared.rect.top;
        var mid = (rtop + rbot) / 2;
        var heights = prepared.view.measure.heights;
        for (var i = 0; i < heights.length - 1; i++) if (mid < heights[i]) break;
        var top = i ? heights[i - 1] : 0, bot = heights[i];
        var result = {
            left: (collapse == "right" ? rect.right : rect.left) - prepared.rect.left,
            right: (collapse == "left" ? rect.left : rect.right) - prepared.rect.left,
            top: top,
            bottom: bot
        };
        if (!rect.left && !rect.right) result.bogus = true;
        if (!cm.options.singleCursorHeightPerLine) {
            result.rtop = rtop;
            result.rbottom = rbot;
        }
        return result;
    }
    function maybeUpdateRectForZooming(measure, rect) {
        if (!window.screen || screen.logicalXDPI == null || screen.logicalXDPI == screen.deviceXDPI || !hasBadZoomedRects(measure)) return rect;
        var scaleX = screen.logicalXDPI / screen.deviceXDPI;
        var scaleY = screen.logicalYDPI / screen.deviceYDPI;
        return {
            left: rect.left * scaleX,
            right: rect.right * scaleX,
            top: rect.top * scaleY,
            bottom: rect.bottom * scaleY
        };
    }
    function clearLineMeasurementCacheFor(lineView) {
        if (lineView.measure) {
            lineView.measure.cache = {};
            lineView.measure.heights = null;
            if (lineView.rest) for (var i = 0; i < lineView.rest.length; i++) lineView.measure.caches[i] = {};
        }
    }
    function clearLineMeasurementCache(cm) {
        cm.display.externalMeasure = null;
        removeChildren(cm.display.lineMeasure);
        for (var i = 0; i < cm.display.view.length; i++) clearLineMeasurementCacheFor(cm.display.view[i]);
    }
    function clearCaches(cm) {
        clearLineMeasurementCache(cm);
        cm.display.cachedCharWidth = cm.display.cachedTextHeight = cm.display.cachedPaddingH = null;
        if (!cm.options.lineWrapping) cm.display.maxLineChanged = true;
        cm.display.lineNumChars = null;
    }
    function pageScrollX() {
        return window.pageXOffset || (document.documentElement || document.body).scrollLeft;
    }
    function pageScrollY() {
        return window.pageYOffset || (document.documentElement || document.body).scrollTop;
    }
    function intoCoordSystem(cm, lineObj, rect, context) {
        if (lineObj.widgets) for (var i = 0; i < lineObj.widgets.length; ++i) if (lineObj.widgets[i].above) {
            var size = widgetHeight(lineObj.widgets[i]);
            rect.top += size;
            rect.bottom += size;
        }
        if (context == "line") return rect;
        if (!context) context = "local";
        var yOff = heightAtLine(lineObj);
        if (context == "local") yOff += paddingTop(cm.display); else yOff -= cm.display.viewOffset;
        if (context == "page" || context == "window") {
            var lOff = cm.display.lineSpace.getBoundingClientRect();
            yOff += lOff.top + (context == "window" ? 0 : pageScrollY());
            var xOff = lOff.left + (context == "window" ? 0 : pageScrollX());
            rect.left += xOff;
            rect.right += xOff;
        }
        rect.top += yOff;
        rect.bottom += yOff;
        return rect;
    }
    function fromCoordSystem(cm, coords, context) {
        if (context == "div") return coords;
        var left = coords.left, top = coords.top;
        if (context == "page") {
            left -= pageScrollX();
            top -= pageScrollY();
        } else if (context == "local" || !context) {
            var localBox = cm.display.sizer.getBoundingClientRect();
            left += localBox.left;
            top += localBox.top;
        }
        var lineSpaceBox = cm.display.lineSpace.getBoundingClientRect();
        return {
            left: left - lineSpaceBox.left,
            top: top - lineSpaceBox.top
        };
    }
    function charCoords(cm, pos, context, lineObj, bias) {
        if (!lineObj) lineObj = getLine(cm.doc, pos.line);
        return intoCoordSystem(cm, lineObj, measureChar(cm, lineObj, pos.ch, bias), context);
    }
    function cursorCoords(cm, pos, context, lineObj, preparedMeasure, varHeight) {
        lineObj = lineObj || getLine(cm.doc, pos.line);
        if (!preparedMeasure) preparedMeasure = prepareMeasureForLine(cm, lineObj);
        function get(ch, right) {
            var m = measureCharPrepared(cm, preparedMeasure, ch, right ? "right" : "left", varHeight);
            if (right) m.left = m.right; else m.right = m.left;
            return intoCoordSystem(cm, lineObj, m, context);
        }
        function getBidi(ch, partPos) {
            var part = order[partPos], right = part.level % 2;
            if (ch == bidiLeft(part) && partPos && part.level < order[partPos - 1].level) {
                part = order[--partPos];
                ch = bidiRight(part) - (part.level % 2 ? 0 : 1);
                right = true;
            } else if (ch == bidiRight(part) && partPos < order.length - 1 && part.level < order[partPos + 1].level) {
                part = order[++partPos];
                ch = bidiLeft(part) - part.level % 2;
                right = false;
            }
            if (right && ch == part.to && ch > part.from) return get(ch - 1);
            return get(ch, right);
        }
        var order = getOrder(lineObj), ch = pos.ch;
        if (!order) return get(ch);
        var partPos = getBidiPartAt(order, ch);
        var val = getBidi(ch, partPos);
        if (bidiOther != null) val.other = getBidi(ch, bidiOther);
        return val;
    }
    function estimateCoords(cm, pos) {
        var left = 0, pos = clipPos(cm.doc, pos);
        if (!cm.options.lineWrapping) left = charWidth(cm.display) * pos.ch;
        var lineObj = getLine(cm.doc, pos.line);
        var top = heightAtLine(lineObj) + paddingTop(cm.display);
        return {
            left: left,
            right: left,
            top: top,
            bottom: top + lineObj.height
        };
    }
    function PosWithInfo(line, ch, outside, xRel) {
        var pos = Pos(line, ch);
        pos.xRel = xRel;
        if (outside) pos.outside = true;
        return pos;
    }
    function coordsChar(cm, x, y) {
        var doc = cm.doc;
        y += cm.display.viewOffset;
        if (y < 0) return PosWithInfo(doc.first, 0, true, -1);
        var lineN = lineAtHeight(doc, y), last = doc.first + doc.size - 1;
        if (lineN > last) return PosWithInfo(doc.first + doc.size - 1, getLine(doc, last).text.length, true, 1);
        if (x < 0) x = 0;
        var lineObj = getLine(doc, lineN);
        for (;;) {
            var found = coordsCharInner(cm, lineObj, lineN, x, y);
            var merged = collapsedSpanAtEnd(lineObj);
            var mergedPos = merged && merged.find(0, true);
            if (merged && (found.ch > mergedPos.from.ch || found.ch == mergedPos.from.ch && found.xRel > 0)) lineN = lineNo(lineObj = mergedPos.to.line); else return found;
        }
    }
    function coordsCharInner(cm, lineObj, lineNo, x, y) {
        var innerOff = y - heightAtLine(lineObj);
        var wrongLine = false, adjust = 2 * cm.display.wrapper.clientWidth;
        var preparedMeasure = prepareMeasureForLine(cm, lineObj);
        function getX(ch) {
            var sp = cursorCoords(cm, Pos(lineNo, ch), "line", lineObj, preparedMeasure);
            wrongLine = true;
            if (innerOff > sp.bottom) return sp.left - adjust; else if (innerOff < sp.top) return sp.left + adjust; else wrongLine = false;
            return sp.left;
        }
        var bidi = getOrder(lineObj), dist = lineObj.text.length;
        var from = lineLeft(lineObj), to = lineRight(lineObj);
        var fromX = getX(from), fromOutside = wrongLine, toX = getX(to), toOutside = wrongLine;
        if (x > toX) return PosWithInfo(lineNo, to, toOutside, 1);
        for (;;) {
            if (bidi ? to == from || to == moveVisually(lineObj, from, 1) : to - from <= 1) {
                var ch = x < fromX || x - fromX <= toX - x ? from : to;
                var xDiff = x - (ch == from ? fromX : toX);
                while (isExtendingChar(lineObj.text.charAt(ch))) ++ch;
                var pos = PosWithInfo(lineNo, ch, ch == from ? fromOutside : toOutside, xDiff < -1 ? -1 : xDiff > 1 ? 1 : 0);
                return pos;
            }
            var step = Math.ceil(dist / 2), middle = from + step;
            if (bidi) {
                middle = from;
                for (var i = 0; i < step; ++i) middle = moveVisually(lineObj, middle, 1);
            }
            var middleX = getX(middle);
            if (middleX > x) {
                to = middle;
                toX = middleX;
                if (toOutside = wrongLine) toX += 1e3;
                dist = step;
            } else {
                from = middle;
                fromX = middleX;
                fromOutside = wrongLine;
                dist -= step;
            }
        }
    }
    var measureText;
    function textHeight(display) {
        if (display.cachedTextHeight != null) return display.cachedTextHeight;
        if (measureText == null) {
            measureText = elt("pre");
            for (var i = 0; i < 49; ++i) {
                measureText.appendChild(document.createTextNode("x"));
                measureText.appendChild(elt("br"));
            }
            measureText.appendChild(document.createTextNode("x"));
        }
        removeChildrenAndAdd(display.measure, measureText);
        var height = measureText.offsetHeight / 50;
        if (height > 3) display.cachedTextHeight = height;
        removeChildren(display.measure);
        return height || 1;
    }
    function charWidth(display) {
        if (display.cachedCharWidth != null) return display.cachedCharWidth;
        var anchor = elt("span", "xxxxxxxxxx");
        var pre = elt("pre", [ anchor ]);
        removeChildrenAndAdd(display.measure, pre);
        var rect = anchor.getBoundingClientRect(), width = (rect.right - rect.left) / 10;
        if (width > 2) display.cachedCharWidth = width;
        return width || 10;
    }
    var operationGroup = null;
    var nextOpId = 0;
    function startOperation(cm) {
        cm.curOp = {
            cm: cm,
            viewChanged: false,
            startHeight: cm.doc.height,
            forceUpdate: false,
            updateInput: null,
            typing: false,
            changeObjs: null,
            cursorActivityHandlers: null,
            cursorActivityCalled: 0,
            selectionChanged: false,
            updateMaxLine: false,
            scrollLeft: null,
            scrollTop: null,
            scrollToPos: null,
            id: ++nextOpId
        };
        if (operationGroup) {
            operationGroup.ops.push(cm.curOp);
        } else {
            cm.curOp.ownsGroup = operationGroup = {
                ops: [ cm.curOp ],
                delayedCallbacks: []
            };
        }
    }
    function fireCallbacksForOps(group) {
        var callbacks = group.delayedCallbacks, i = 0;
        do {
            for (;i < callbacks.length; i++) callbacks[i]();
            for (var j = 0; j < group.ops.length; j++) {
                var op = group.ops[j];
                if (op.cursorActivityHandlers) while (op.cursorActivityCalled < op.cursorActivityHandlers.length) op.cursorActivityHandlers[op.cursorActivityCalled++](op.cm);
            }
        } while (i < callbacks.length);
    }
    function endOperation(cm) {
        var op = cm.curOp, group = op.ownsGroup;
        if (!group) return;
        try {
            fireCallbacksForOps(group);
        } finally {
            operationGroup = null;
            for (var i = 0; i < group.ops.length; i++) group.ops[i].cm.curOp = null;
            endOperations(group);
        }
    }
    function endOperations(group) {
        var ops = group.ops;
        for (var i = 0; i < ops.length; i++) endOperation_R1(ops[i]);
        for (var i = 0; i < ops.length; i++) endOperation_W1(ops[i]);
        for (var i = 0; i < ops.length; i++) endOperation_R2(ops[i]);
        for (var i = 0; i < ops.length; i++) endOperation_W2(ops[i]);
        for (var i = 0; i < ops.length; i++) endOperation_finish(ops[i]);
    }
    function endOperation_R1(op) {
        var cm = op.cm, display = cm.display;
        if (op.updateMaxLine) findMaxLine(cm);
        op.mustUpdate = op.viewChanged || op.forceUpdate || op.scrollTop != null || op.scrollToPos && (op.scrollToPos.from.line < display.viewFrom || op.scrollToPos.to.line >= display.viewTo) || display.maxLineChanged && cm.options.lineWrapping;
        op.update = op.mustUpdate && new DisplayUpdate(cm, op.mustUpdate && {
            top: op.scrollTop,
            ensure: op.scrollToPos
        }, op.forceUpdate);
    }
    function endOperation_W1(op) {
        op.updatedDisplay = op.mustUpdate && updateDisplayIfNeeded(op.cm, op.update);
    }
    function endOperation_R2(op) {
        var cm = op.cm, display = cm.display;
        if (op.updatedDisplay) updateHeightsInViewport(cm);
        op.barMeasure = measureForScrollbars(cm);
        if (display.maxLineChanged && !cm.options.lineWrapping) {
            op.adjustWidthTo = measureChar(cm, display.maxLine, display.maxLine.text.length).left + 3;
            op.maxScrollLeft = Math.max(0, display.sizer.offsetLeft + op.adjustWidthTo + scrollerCutOff - display.scroller.clientWidth);
        }
        if (op.updatedDisplay || op.selectionChanged) op.newSelectionNodes = drawSelection(cm);
    }
    function endOperation_W2(op) {
        var cm = op.cm;
        if (op.adjustWidthTo != null) {
            cm.display.sizer.style.minWidth = op.adjustWidthTo + "px";
            if (op.maxScrollLeft < cm.doc.scrollLeft) setScrollLeft(cm, Math.min(cm.display.scroller.scrollLeft, op.maxScrollLeft), true);
            cm.display.maxLineChanged = false;
        }
        if (op.newSelectionNodes) showSelection(cm, op.newSelectionNodes);
        if (op.updatedDisplay) setDocumentHeight(cm, op.barMeasure);
        if (op.updatedDisplay || op.startHeight != cm.doc.height) updateScrollbars(cm, op.barMeasure);
        if (op.selectionChanged) restartBlink(cm);
        if (cm.state.focused && op.updateInput) resetInput(cm, op.typing);
    }
    function endOperation_finish(op) {
        var cm = op.cm, display = cm.display, doc = cm.doc;
        if (op.adjustWidthTo != null && Math.abs(op.barMeasure.scrollWidth - cm.display.scroller.scrollWidth) > 1) updateScrollbars(cm);
        if (op.updatedDisplay) postUpdateDisplay(cm, op.update);
        if (display.wheelStartX != null && (op.scrollTop != null || op.scrollLeft != null || op.scrollToPos)) display.wheelStartX = display.wheelStartY = null;
        if (op.scrollTop != null && (display.scroller.scrollTop != op.scrollTop || op.forceScroll)) {
            var top = Math.max(0, Math.min(display.scroller.scrollHeight - display.scroller.clientHeight, op.scrollTop));
            display.scroller.scrollTop = display.scrollbarV.scrollTop = doc.scrollTop = top;
        }
        if (op.scrollLeft != null && (display.scroller.scrollLeft != op.scrollLeft || op.forceScroll)) {
            var left = Math.max(0, Math.min(display.scroller.scrollWidth - display.scroller.clientWidth, op.scrollLeft));
            display.scroller.scrollLeft = display.scrollbarH.scrollLeft = doc.scrollLeft = left;
            alignHorizontally(cm);
        }
        if (op.scrollToPos) {
            var coords = scrollPosIntoView(cm, clipPos(doc, op.scrollToPos.from), clipPos(doc, op.scrollToPos.to), op.scrollToPos.margin);
            if (op.scrollToPos.isCursor && cm.state.focused) maybeScrollWindow(cm, coords);
        }
        var hidden = op.maybeHiddenMarkers, unhidden = op.maybeUnhiddenMarkers;
        if (hidden) for (var i = 0; i < hidden.length; ++i) if (!hidden[i].lines.length) signal(hidden[i], "hide");
        if (unhidden) for (var i = 0; i < unhidden.length; ++i) if (unhidden[i].lines.length) signal(unhidden[i], "unhide");
        if (display.wrapper.offsetHeight) doc.scrollTop = cm.display.scroller.scrollTop;
        if (op.updatedDisplay && webkit) {
            if (cm.options.lineWrapping) checkForWebkitWidthBug(cm, op.barMeasure);
            if (op.barMeasure.scrollWidth > op.barMeasure.clientWidth && op.barMeasure.scrollWidth < op.barMeasure.clientWidth + 1 && !hScrollbarTakesSpace(cm)) updateScrollbars(cm);
        }
        if (op.changeObjs) signal(cm, "changes", cm, op.changeObjs);
    }
    function runInOp(cm, f) {
        if (cm.curOp) return f();
        startOperation(cm);
        try {
            return f();
        } finally {
            endOperation(cm);
        }
    }
    function operation(cm, f) {
        return function() {
            if (cm.curOp) return f.apply(cm, arguments);
            startOperation(cm);
            try {
                return f.apply(cm, arguments);
            } finally {
                endOperation(cm);
            }
        };
    }
    function methodOp(f) {
        return function() {
            if (this.curOp) return f.apply(this, arguments);
            startOperation(this);
            try {
                return f.apply(this, arguments);
            } finally {
                endOperation(this);
            }
        };
    }
    function docMethodOp(f) {
        return function() {
            var cm = this.cm;
            if (!cm || cm.curOp) return f.apply(this, arguments);
            startOperation(cm);
            try {
                return f.apply(this, arguments);
            } finally {
                endOperation(cm);
            }
        };
    }
    function LineView(doc, line, lineN) {
        this.line = line;
        this.rest = visualLineContinued(line);
        this.size = this.rest ? lineNo(lst(this.rest)) - lineN + 1 : 1;
        this.node = this.text = null;
        this.hidden = lineIsHidden(doc, line);
    }
    function buildViewArray(cm, from, to) {
        var array = [], nextPos;
        for (var pos = from; pos < to; pos = nextPos) {
            var view = new LineView(cm.doc, getLine(cm.doc, pos), pos);
            nextPos = pos + view.size;
            array.push(view);
        }
        return array;
    }
    function regChange(cm, from, to, lendiff) {
        if (from == null) from = cm.doc.first;
        if (to == null) to = cm.doc.first + cm.doc.size;
        if (!lendiff) lendiff = 0;
        var display = cm.display;
        if (lendiff && to < display.viewTo && (display.updateLineNumbers == null || display.updateLineNumbers > from)) display.updateLineNumbers = from;
        cm.curOp.viewChanged = true;
        if (from >= display.viewTo) {
            if (sawCollapsedSpans && visualLineNo(cm.doc, from) < display.viewTo) resetView(cm);
        } else if (to <= display.viewFrom) {
            if (sawCollapsedSpans && visualLineEndNo(cm.doc, to + lendiff) > display.viewFrom) {
                resetView(cm);
            } else {
                display.viewFrom += lendiff;
                display.viewTo += lendiff;
            }
        } else if (from <= display.viewFrom && to >= display.viewTo) {
            resetView(cm);
        } else if (from <= display.viewFrom) {
            var cut = viewCuttingPoint(cm, to, to + lendiff, 1);
            if (cut) {
                display.view = display.view.slice(cut.index);
                display.viewFrom = cut.lineN;
                display.viewTo += lendiff;
            } else {
                resetView(cm);
            }
        } else if (to >= display.viewTo) {
            var cut = viewCuttingPoint(cm, from, from, -1);
            if (cut) {
                display.view = display.view.slice(0, cut.index);
                display.viewTo = cut.lineN;
            } else {
                resetView(cm);
            }
        } else {
            var cutTop = viewCuttingPoint(cm, from, from, -1);
            var cutBot = viewCuttingPoint(cm, to, to + lendiff, 1);
            if (cutTop && cutBot) {
                display.view = display.view.slice(0, cutTop.index).concat(buildViewArray(cm, cutTop.lineN, cutBot.lineN)).concat(display.view.slice(cutBot.index));
                display.viewTo += lendiff;
            } else {
                resetView(cm);
            }
        }
        var ext = display.externalMeasured;
        if (ext) {
            if (to < ext.lineN) ext.lineN += lendiff; else if (from < ext.lineN + ext.size) display.externalMeasured = null;
        }
    }
    function regLineChange(cm, line, type) {
        cm.curOp.viewChanged = true;
        var display = cm.display, ext = cm.display.externalMeasured;
        if (ext && line >= ext.lineN && line < ext.lineN + ext.size) display.externalMeasured = null;
        if (line < display.viewFrom || line >= display.viewTo) return;
        var lineView = display.view[findViewIndex(cm, line)];
        if (lineView.node == null) return;
        var arr = lineView.changes || (lineView.changes = []);
        if (indexOf(arr, type) == -1) arr.push(type);
    }
    function resetView(cm) {
        cm.display.viewFrom = cm.display.viewTo = cm.doc.first;
        cm.display.view = [];
        cm.display.viewOffset = 0;
    }
    function findViewIndex(cm, n) {
        if (n >= cm.display.viewTo) return null;
        n -= cm.display.viewFrom;
        if (n < 0) return null;
        var view = cm.display.view;
        for (var i = 0; i < view.length; i++) {
            n -= view[i].size;
            if (n < 0) return i;
        }
    }
    function viewCuttingPoint(cm, oldN, newN, dir) {
        var index = findViewIndex(cm, oldN), diff, view = cm.display.view;
        if (!sawCollapsedSpans || newN == cm.doc.first + cm.doc.size) return {
            index: index,
            lineN: newN
        };
        for (var i = 0, n = cm.display.viewFrom; i < index; i++) n += view[i].size;
        if (n != oldN) {
            if (dir > 0) {
                if (index == view.length - 1) return null;
                diff = n + view[index].size - oldN;
                index++;
            } else {
                diff = n - oldN;
            }
            oldN += diff;
            newN += diff;
        }
        while (visualLineNo(cm.doc, newN) != newN) {
            if (index == (dir < 0 ? 0 : view.length - 1)) return null;
            newN += dir * view[index - (dir < 0 ? 1 : 0)].size;
            index += dir;
        }
        return {
            index: index,
            lineN: newN
        };
    }
    function adjustView(cm, from, to) {
        var display = cm.display, view = display.view;
        if (view.length == 0 || from >= display.viewTo || to <= display.viewFrom) {
            display.view = buildViewArray(cm, from, to);
            display.viewFrom = from;
        } else {
            if (display.viewFrom > from) display.view = buildViewArray(cm, from, display.viewFrom).concat(display.view); else if (display.viewFrom < from) display.view = display.view.slice(findViewIndex(cm, from));
            display.viewFrom = from;
            if (display.viewTo < to) display.view = display.view.concat(buildViewArray(cm, display.viewTo, to)); else if (display.viewTo > to) display.view = display.view.slice(0, findViewIndex(cm, to));
        }
        display.viewTo = to;
    }
    function countDirtyView(cm) {
        var view = cm.display.view, dirty = 0;
        for (var i = 0; i < view.length; i++) {
            var lineView = view[i];
            if (!lineView.hidden && (!lineView.node || lineView.changes)) ++dirty;
        }
        return dirty;
    }
    function slowPoll(cm) {
        if (cm.display.pollingFast) return;
        cm.display.poll.set(cm.options.pollInterval, function() {
            readInput(cm);
            if (cm.state.focused) slowPoll(cm);
        });
    }
    function fastPoll(cm) {
        var missed = false;
        cm.display.pollingFast = true;
        function p() {
            var changed = readInput(cm);
            if (!changed && !missed) {
                missed = true;
                cm.display.poll.set(60, p);
            } else {
                cm.display.pollingFast = false;
                slowPoll(cm);
            }
        }
        cm.display.poll.set(20, p);
    }
    var lastCopied = null;
    function readInput(cm) {
        var input = cm.display.input, prevInput = cm.display.prevInput, doc = cm.doc;
        if (!cm.state.focused || hasSelection(input) && !prevInput || isReadOnly(cm) || cm.options.disableInput || cm.state.keySeq) return false;
        if (cm.state.pasteIncoming && cm.state.fakedLastChar) {
            input.value = input.value.substring(0, input.value.length - 1);
            cm.state.fakedLastChar = false;
        }
        var text = input.value;
        if (text == prevInput && !cm.somethingSelected()) return false;
        if (ie && ie_version >= 9 && cm.display.inputHasSelection === text || mac && /[\uf700-\uf7ff]/.test(text)) {
            resetInput(cm);
            return false;
        }
        var withOp = !cm.curOp;
        if (withOp) startOperation(cm);
        cm.display.shift = false;
        if (text.charCodeAt(0) == 8203 && doc.sel == cm.display.selForContextMenu && !prevInput) prevInput = "​";
        var same = 0, l = Math.min(prevInput.length, text.length);
        while (same < l && prevInput.charCodeAt(same) == text.charCodeAt(same)) ++same;
        var inserted = text.slice(same), textLines = splitLines(inserted);
        var multiPaste = null;
        if (cm.state.pasteIncoming && doc.sel.ranges.length > 1) {
            if (lastCopied && lastCopied.join("\n") == inserted) multiPaste = doc.sel.ranges.length % lastCopied.length == 0 && map(lastCopied, splitLines); else if (textLines.length == doc.sel.ranges.length) multiPaste = map(textLines, function(l) {
                return [ l ];
            });
        }
        for (var i = doc.sel.ranges.length - 1; i >= 0; i--) {
            var range = doc.sel.ranges[i];
            var from = range.from(), to = range.to();
            if (same < prevInput.length) from = Pos(from.line, from.ch - (prevInput.length - same)); else if (cm.state.overwrite && range.empty() && !cm.state.pasteIncoming) to = Pos(to.line, Math.min(getLine(doc, to.line).text.length, to.ch + lst(textLines).length));
            var updateInput = cm.curOp.updateInput;
            var changeEvent = {
                from: from,
                to: to,
                text: multiPaste ? multiPaste[i % multiPaste.length] : textLines,
                origin: cm.state.pasteIncoming ? "paste" : cm.state.cutIncoming ? "cut" : "+input"
            };
            makeChange(cm.doc, changeEvent);
            signalLater(cm, "inputRead", cm, changeEvent);
            if (inserted && !cm.state.pasteIncoming && cm.options.electricChars && cm.options.smartIndent && range.head.ch < 100 && (!i || doc.sel.ranges[i - 1].head.line != range.head.line)) {
                var mode = cm.getModeAt(range.head);
                var end = changeEnd(changeEvent);
                if (mode.electricChars) {
                    for (var j = 0; j < mode.electricChars.length; j++) if (inserted.indexOf(mode.electricChars.charAt(j)) > -1) {
                        indentLine(cm, end.line, "smart");
                        break;
                    }
                } else if (mode.electricInput) {
                    if (mode.electricInput.test(getLine(doc, end.line).text.slice(0, end.ch))) indentLine(cm, end.line, "smart");
                }
            }
        }
        ensureCursorVisible(cm);
        cm.curOp.updateInput = updateInput;
        cm.curOp.typing = true;
        if (text.length > 1e3 || text.indexOf("\n") > -1) input.value = cm.display.prevInput = ""; else cm.display.prevInput = text;
        if (withOp) endOperation(cm);
        cm.state.pasteIncoming = cm.state.cutIncoming = false;
        return true;
    }
    function resetInput(cm, typing) {
        var minimal, selected, doc = cm.doc;
        if (cm.somethingSelected()) {
            cm.display.prevInput = "";
            var range = doc.sel.primary();
            minimal = hasCopyEvent && (range.to().line - range.from().line > 100 || (selected = cm.getSelection()).length > 1e3);
            var content = minimal ? "-" : selected || cm.getSelection();
            cm.display.input.value = content;
            if (cm.state.focused) selectInput(cm.display.input);
            if (ie && ie_version >= 9) cm.display.inputHasSelection = content;
        } else if (!typing) {
            cm.display.prevInput = cm.display.input.value = "";
            if (ie && ie_version >= 9) cm.display.inputHasSelection = null;
        }
        cm.display.inaccurateSelection = minimal;
    }
    function focusInput(cm) {
        if (cm.options.readOnly != "nocursor" && (!mobile || activeElt() != cm.display.input)) cm.display.input.focus();
    }
    function ensureFocus(cm) {
        if (!cm.state.focused) {
            focusInput(cm);
            onFocus(cm);
        }
    }
    function isReadOnly(cm) {
        return cm.options.readOnly || cm.doc.cantEdit;
    }
    function registerEventHandlers(cm) {
        var d = cm.display;
        on(d.scroller, "mousedown", operation(cm, onMouseDown));
        if (ie && ie_version < 11) on(d.scroller, "dblclick", operation(cm, function(e) {
            if (signalDOMEvent(cm, e)) return;
            var pos = posFromMouse(cm, e);
            if (!pos || clickInGutter(cm, e) || eventInWidget(cm.display, e)) return;
            e_preventDefault(e);
            var word = cm.findWordAt(pos);
            extendSelection(cm.doc, word.anchor, word.head);
        })); else on(d.scroller, "dblclick", function(e) {
            signalDOMEvent(cm, e) || e_preventDefault(e);
        });
        on(d.lineSpace, "selectstart", function(e) {
            if (!eventInWidget(d, e)) e_preventDefault(e);
        });
        if (!captureRightClick) on(d.scroller, "contextmenu", function(e) {
            onContextMenu(cm, e);
        });
        on(d.scroller, "scroll", function() {
            if (d.scroller.clientHeight) {
                setScrollTop(cm, d.scroller.scrollTop);
                setScrollLeft(cm, d.scroller.scrollLeft, true);
                signal(cm, "scroll", cm);
            }
        });
        on(d.scrollbarV, "scroll", function() {
            if (d.scroller.clientHeight) setScrollTop(cm, d.scrollbarV.scrollTop);
        });
        on(d.scrollbarH, "scroll", function() {
            if (d.scroller.clientHeight) setScrollLeft(cm, d.scrollbarH.scrollLeft);
        });
        on(d.scroller, "mousewheel", function(e) {
            onScrollWheel(cm, e);
        });
        on(d.scroller, "DOMMouseScroll", function(e) {
            onScrollWheel(cm, e);
        });
        function reFocus() {
            if (cm.state.focused) setTimeout(bind(focusInput, cm), 0);
        }
        on(d.scrollbarH, "mousedown", reFocus);
        on(d.scrollbarV, "mousedown", reFocus);
        on(d.wrapper, "scroll", function() {
            d.wrapper.scrollTop = d.wrapper.scrollLeft = 0;
        });
        on(d.input, "keyup", function(e) {
            onKeyUp.call(cm, e);
        });
        on(d.input, "input", function() {
            if (ie && ie_version >= 9 && cm.display.inputHasSelection) cm.display.inputHasSelection = null;
            fastPoll(cm);
        });
        on(d.input, "keydown", operation(cm, onKeyDown));
        on(d.input, "keypress", operation(cm, onKeyPress));
        on(d.input, "focus", bind(onFocus, cm));
        on(d.input, "blur", bind(onBlur, cm));
        function drag_(e) {
            if (!signalDOMEvent(cm, e)) e_stop(e);
        }
        if (cm.options.dragDrop) {
            on(d.scroller, "dragstart", function(e) {
                onDragStart(cm, e);
            });
            on(d.scroller, "dragenter", drag_);
            on(d.scroller, "dragover", drag_);
            on(d.scroller, "drop", operation(cm, onDrop));
        }
        on(d.scroller, "paste", function(e) {
            if (eventInWidget(d, e)) return;
            cm.state.pasteIncoming = true;
            focusInput(cm);
            fastPoll(cm);
        });
        on(d.input, "paste", function() {
            if (webkit && !cm.state.fakedLastChar && !(new Date() - cm.state.lastMiddleDown < 200)) {
                var start = d.input.selectionStart, end = d.input.selectionEnd;
                d.input.value += "$";
                d.input.selectionEnd = end;
                d.input.selectionStart = start;
                cm.state.fakedLastChar = true;
            }
            cm.state.pasteIncoming = true;
            fastPoll(cm);
        });
        function prepareCopyCut(e) {
            if (cm.somethingSelected()) {
                lastCopied = cm.getSelections();
                if (d.inaccurateSelection) {
                    d.prevInput = "";
                    d.inaccurateSelection = false;
                    d.input.value = lastCopied.join("\n");
                    selectInput(d.input);
                }
            } else {
                var text = [], ranges = [];
                for (var i = 0; i < cm.doc.sel.ranges.length; i++) {
                    var line = cm.doc.sel.ranges[i].head.line;
                    var lineRange = {
                        anchor: Pos(line, 0),
                        head: Pos(line + 1, 0)
                    };
                    ranges.push(lineRange);
                    text.push(cm.getRange(lineRange.anchor, lineRange.head));
                }
                if (e.type == "cut") {
                    cm.setSelections(ranges, null, sel_dontScroll);
                } else {
                    d.prevInput = "";
                    d.input.value = text.join("\n");
                    selectInput(d.input);
                }
                lastCopied = text;
            }
            if (e.type == "cut") cm.state.cutIncoming = true;
        }
        on(d.input, "cut", prepareCopyCut);
        on(d.input, "copy", prepareCopyCut);
        if (khtml) on(d.sizer, "mouseup", function() {
            if (activeElt() == d.input) d.input.blur();
            focusInput(cm);
        });
    }
    function onResize(cm) {
        var d = cm.display;
        if (d.lastWrapHeight == d.wrapper.clientHeight && d.lastWrapWidth == d.wrapper.clientWidth) return;
        d.cachedCharWidth = d.cachedTextHeight = d.cachedPaddingH = null;
        cm.setSize();
    }
    function eventInWidget(display, e) {
        for (var n = e_target(e); n != display.wrapper; n = n.parentNode) {
            if (!n || n.ignoreEvents || n.parentNode == display.sizer && n != display.mover) return true;
        }
    }
    function posFromMouse(cm, e, liberal, forRect) {
        var display = cm.display;
        if (!liberal) {
            var target = e_target(e);
            if (target == display.scrollbarH || target == display.scrollbarV || target == display.scrollbarFiller || target == display.gutterFiller) return null;
        }
        var x, y, space = display.lineSpace.getBoundingClientRect();
        try {
            x = e.clientX - space.left;
            y = e.clientY - space.top;
        } catch (e) {
            return null;
        }
        var coords = coordsChar(cm, x, y), line;
        if (forRect && coords.xRel == 1 && (line = getLine(cm.doc, coords.line).text).length == coords.ch) {
            var colDiff = countColumn(line, line.length, cm.options.tabSize) - line.length;
            coords = Pos(coords.line, Math.max(0, Math.round((x - paddingH(cm.display).left) / charWidth(cm.display)) - colDiff));
        }
        return coords;
    }
    function onMouseDown(e) {
        if (signalDOMEvent(this, e)) return;
        var cm = this, display = cm.display;
        display.shift = e.shiftKey;
        if (eventInWidget(display, e)) {
            if (!webkit) {
                display.scroller.draggable = false;
                setTimeout(function() {
                    display.scroller.draggable = true;
                }, 100);
            }
            return;
        }
        if (clickInGutter(cm, e)) return;
        var start = posFromMouse(cm, e);
        window.focus();
        switch (e_button(e)) {
          case 1:
            if (start) leftButtonDown(cm, e, start); else if (e_target(e) == display.scroller) e_preventDefault(e);
            break;

          case 2:
            if (webkit) cm.state.lastMiddleDown = +new Date();
            if (start) extendSelection(cm.doc, start);
            setTimeout(bind(focusInput, cm), 20);
            e_preventDefault(e);
            break;

          case 3:
            if (captureRightClick) onContextMenu(cm, e);
            break;
        }
    }
    var lastClick, lastDoubleClick;
    function leftButtonDown(cm, e, start) {
        setTimeout(bind(ensureFocus, cm), 0);
        var now = +new Date(), type;
        if (lastDoubleClick && lastDoubleClick.time > now - 400 && cmp(lastDoubleClick.pos, start) == 0) {
            type = "triple";
        } else if (lastClick && lastClick.time > now - 400 && cmp(lastClick.pos, start) == 0) {
            type = "double";
            lastDoubleClick = {
                time: now,
                pos: start
            };
        } else {
            type = "single";
            lastClick = {
                time: now,
                pos: start
            };
        }
        var sel = cm.doc.sel, modifier = mac ? e.metaKey : e.ctrlKey;
        if (cm.options.dragDrop && dragAndDrop && !isReadOnly(cm) && type == "single" && sel.contains(start) > -1 && sel.somethingSelected()) leftButtonStartDrag(cm, e, start, modifier); else leftButtonSelect(cm, e, start, type, modifier);
    }
    function leftButtonStartDrag(cm, e, start, modifier) {
        var display = cm.display;
        var dragEnd = operation(cm, function(e2) {
            if (webkit) display.scroller.draggable = false;
            cm.state.draggingText = false;
            off(document, "mouseup", dragEnd);
            off(display.scroller, "drop", dragEnd);
            if (Math.abs(e.clientX - e2.clientX) + Math.abs(e.clientY - e2.clientY) < 10) {
                e_preventDefault(e2);
                if (!modifier) extendSelection(cm.doc, start);
                focusInput(cm);
                if (ie && ie_version == 9) setTimeout(function() {
                    document.body.focus();
                    focusInput(cm);
                }, 20);
            }
        });
        if (webkit) display.scroller.draggable = true;
        cm.state.draggingText = dragEnd;
        if (display.scroller.dragDrop) display.scroller.dragDrop();
        on(document, "mouseup", dragEnd);
        on(display.scroller, "drop", dragEnd);
    }
    function leftButtonSelect(cm, e, start, type, addNew) {
        var display = cm.display, doc = cm.doc;
        e_preventDefault(e);
        var ourRange, ourIndex, startSel = doc.sel;
        if (addNew && !e.shiftKey) {
            ourIndex = doc.sel.contains(start);
            if (ourIndex > -1) ourRange = doc.sel.ranges[ourIndex]; else ourRange = new Range(start, start);
        } else {
            ourRange = doc.sel.primary();
        }
        if (e.altKey) {
            type = "rect";
            if (!addNew) ourRange = new Range(start, start);
            start = posFromMouse(cm, e, true, true);
            ourIndex = -1;
        } else if (type == "double") {
            var word = cm.findWordAt(start);
            if (cm.display.shift || doc.extend) ourRange = extendRange(doc, ourRange, word.anchor, word.head); else ourRange = word;
        } else if (type == "triple") {
            var line = new Range(Pos(start.line, 0), clipPos(doc, Pos(start.line + 1, 0)));
            if (cm.display.shift || doc.extend) ourRange = extendRange(doc, ourRange, line.anchor, line.head); else ourRange = line;
        } else {
            ourRange = extendRange(doc, ourRange, start);
        }
        if (!addNew) {
            ourIndex = 0;
            setSelection(doc, new Selection([ ourRange ], 0), sel_mouse);
            startSel = doc.sel;
        } else if (ourIndex > -1) {
            replaceOneSelection(doc, ourIndex, ourRange, sel_mouse);
        } else {
            ourIndex = doc.sel.ranges.length;
            setSelection(doc, normalizeSelection(doc.sel.ranges.concat([ ourRange ]), ourIndex), {
                scroll: false,
                origin: "*mouse"
            });
        }
        var lastPos = start;
        function extendTo(pos) {
            if (cmp(lastPos, pos) == 0) return;
            lastPos = pos;
            if (type == "rect") {
                var ranges = [], tabSize = cm.options.tabSize;
                var startCol = countColumn(getLine(doc, start.line).text, start.ch, tabSize);
                var posCol = countColumn(getLine(doc, pos.line).text, pos.ch, tabSize);
                var left = Math.min(startCol, posCol), right = Math.max(startCol, posCol);
                for (var line = Math.min(start.line, pos.line), end = Math.min(cm.lastLine(), Math.max(start.line, pos.line)); line <= end; line++) {
                    var text = getLine(doc, line).text, leftPos = findColumn(text, left, tabSize);
                    if (left == right) ranges.push(new Range(Pos(line, leftPos), Pos(line, leftPos))); else if (text.length > leftPos) ranges.push(new Range(Pos(line, leftPos), Pos(line, findColumn(text, right, tabSize))));
                }
                if (!ranges.length) ranges.push(new Range(start, start));
                setSelection(doc, normalizeSelection(startSel.ranges.slice(0, ourIndex).concat(ranges), ourIndex), {
                    origin: "*mouse",
                    scroll: false
                });
                cm.scrollIntoView(pos);
            } else {
                var oldRange = ourRange;
                var anchor = oldRange.anchor, head = pos;
                if (type != "single") {
                    if (type == "double") var range = cm.findWordAt(pos); else var range = new Range(Pos(pos.line, 0), clipPos(doc, Pos(pos.line + 1, 0)));
                    if (cmp(range.anchor, anchor) > 0) {
                        head = range.head;
                        anchor = minPos(oldRange.from(), range.anchor);
                    } else {
                        head = range.anchor;
                        anchor = maxPos(oldRange.to(), range.head);
                    }
                }
                var ranges = startSel.ranges.slice(0);
                ranges[ourIndex] = new Range(clipPos(doc, anchor), head);
                setSelection(doc, normalizeSelection(ranges, ourIndex), sel_mouse);
            }
        }
        var editorSize = display.wrapper.getBoundingClientRect();
        var counter = 0;
        function extend(e) {
            var curCount = ++counter;
            var cur = posFromMouse(cm, e, true, type == "rect");
            if (!cur) return;
            if (cmp(cur, lastPos) != 0) {
                ensureFocus(cm);
                extendTo(cur);
                var visible = visibleLines(display, doc);
                if (cur.line >= visible.to || cur.line < visible.from) setTimeout(operation(cm, function() {
                    if (counter == curCount) extend(e);
                }), 150);
            } else {
                var outside = e.clientY < editorSize.top ? -20 : e.clientY > editorSize.bottom ? 20 : 0;
                if (outside) setTimeout(operation(cm, function() {
                    if (counter != curCount) return;
                    display.scroller.scrollTop += outside;
                    extend(e);
                }), 50);
            }
        }
        function done(e) {
            counter = Infinity;
            e_preventDefault(e);
            focusInput(cm);
            off(document, "mousemove", move);
            off(document, "mouseup", up);
            doc.history.lastSelOrigin = null;
        }
        var move = operation(cm, function(e) {
            if (!e_button(e)) done(e); else extend(e);
        });
        var up = operation(cm, done);
        on(document, "mousemove", move);
        on(document, "mouseup", up);
    }
    function gutterEvent(cm, e, type, prevent, signalfn) {
        try {
            var mX = e.clientX, mY = e.clientY;
        } catch (e) {
            return false;
        }
        if (mX >= Math.floor(cm.display.gutters.getBoundingClientRect().right)) return false;
        if (prevent) e_preventDefault(e);
        var display = cm.display;
        var lineBox = display.lineDiv.getBoundingClientRect();
        if (mY > lineBox.bottom || !hasHandler(cm, type)) return e_defaultPrevented(e);
        mY -= lineBox.top - display.viewOffset;
        for (var i = 0; i < cm.options.gutters.length; ++i) {
            var g = display.gutters.childNodes[i];
            if (g && g.getBoundingClientRect().right >= mX) {
                var line = lineAtHeight(cm.doc, mY);
                var gutter = cm.options.gutters[i];
                signalfn(cm, type, cm, line, gutter, e);
                return e_defaultPrevented(e);
            }
        }
    }
    function clickInGutter(cm, e) {
        return gutterEvent(cm, e, "gutterClick", true, signalLater);
    }
    var lastDrop = 0;
    function onDrop(e) {
        var cm = this;
        if (signalDOMEvent(cm, e) || eventInWidget(cm.display, e)) return;
        e_preventDefault(e);
        if (ie) lastDrop = +new Date();
        var pos = posFromMouse(cm, e, true), files = e.dataTransfer.files;
        if (!pos || isReadOnly(cm)) return;
        if (files && files.length && window.FileReader && window.File) {
            var n = files.length, text = Array(n), read = 0;
            var loadFile = function(file, i) {
                var reader = new FileReader();
                reader.onload = operation(cm, function() {
                    text[i] = reader.result;
                    if (++read == n) {
                        pos = clipPos(cm.doc, pos);
                        var change = {
                            from: pos,
                            to: pos,
                            text: splitLines(text.join("\n")),
                            origin: "paste"
                        };
                        makeChange(cm.doc, change);
                        setSelectionReplaceHistory(cm.doc, simpleSelection(pos, changeEnd(change)));
                    }
                });
                reader.readAsText(file);
            };
            for (var i = 0; i < n; ++i) loadFile(files[i], i);
        } else {
            if (cm.state.draggingText && cm.doc.sel.contains(pos) > -1) {
                cm.state.draggingText(e);
                setTimeout(bind(focusInput, cm), 20);
                return;
            }
            try {
                var text = e.dataTransfer.getData("Text");
                if (text) {
                    if (cm.state.draggingText && !(mac ? e.metaKey : e.ctrlKey)) var selected = cm.listSelections();
                    setSelectionNoUndo(cm.doc, simpleSelection(pos, pos));
                    if (selected) for (var i = 0; i < selected.length; ++i) replaceRange(cm.doc, "", selected[i].anchor, selected[i].head, "drag");
                    cm.replaceSelection(text, "around", "paste");
                    focusInput(cm);
                }
            } catch (e) {}
        }
    }
    function onDragStart(cm, e) {
        if (ie && (!cm.state.draggingText || +new Date() - lastDrop < 100)) {
            e_stop(e);
            return;
        }
        if (signalDOMEvent(cm, e) || eventInWidget(cm.display, e)) return;
        e.dataTransfer.setData("Text", cm.getSelection());
        if (e.dataTransfer.setDragImage && !safari) {
            var img = elt("img", null, null, "position: fixed; left: 0; top: 0;");
            img.src = "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==";
            if (presto) {
                img.width = img.height = 1;
                cm.display.wrapper.appendChild(img);
                img._top = img.offsetTop;
            }
            e.dataTransfer.setDragImage(img, 0, 0);
            if (presto) img.parentNode.removeChild(img);
        }
    }
    function setScrollTop(cm, val) {
        if (Math.abs(cm.doc.scrollTop - val) < 2) return;
        cm.doc.scrollTop = val;
        if (!gecko) updateDisplaySimple(cm, {
            top: val
        });
        if (cm.display.scroller.scrollTop != val) cm.display.scroller.scrollTop = val;
        if (cm.display.scrollbarV.scrollTop != val) cm.display.scrollbarV.scrollTop = val;
        if (gecko) updateDisplaySimple(cm);
        startWorker(cm, 100);
    }
    function setScrollLeft(cm, val, isScroller) {
        if (isScroller ? val == cm.doc.scrollLeft : Math.abs(cm.doc.scrollLeft - val) < 2) return;
        val = Math.min(val, cm.display.scroller.scrollWidth - cm.display.scroller.clientWidth);
        cm.doc.scrollLeft = val;
        alignHorizontally(cm);
        if (cm.display.scroller.scrollLeft != val) cm.display.scroller.scrollLeft = val;
        if (cm.display.scrollbarH.scrollLeft != val) cm.display.scrollbarH.scrollLeft = val;
    }
    var wheelSamples = 0, wheelPixelsPerUnit = null;
    if (ie) wheelPixelsPerUnit = -.53; else if (gecko) wheelPixelsPerUnit = 15; else if (chrome) wheelPixelsPerUnit = -.7; else if (safari) wheelPixelsPerUnit = -1 / 3;
    function onScrollWheel(cm, e) {
        var dx = e.wheelDeltaX, dy = e.wheelDeltaY;
        if (dx == null && e.detail && e.axis == e.HORIZONTAL_AXIS) dx = e.detail;
        if (dy == null && e.detail && e.axis == e.VERTICAL_AXIS) dy = e.detail; else if (dy == null) dy = e.wheelDelta;
        var display = cm.display, scroll = display.scroller;
        if (!(dx && scroll.scrollWidth > scroll.clientWidth || dy && scroll.scrollHeight > scroll.clientHeight)) return;
        if (dy && mac && webkit) {
            outer: for (var cur = e.target, view = display.view; cur != scroll; cur = cur.parentNode) {
                for (var i = 0; i < view.length; i++) {
                    if (view[i].node == cur) {
                        cm.display.currentWheelTarget = cur;
                        break outer;
                    }
                }
            }
        }
        if (dx && !gecko && !presto && wheelPixelsPerUnit != null) {
            if (dy) setScrollTop(cm, Math.max(0, Math.min(scroll.scrollTop + dy * wheelPixelsPerUnit, scroll.scrollHeight - scroll.clientHeight)));
            setScrollLeft(cm, Math.max(0, Math.min(scroll.scrollLeft + dx * wheelPixelsPerUnit, scroll.scrollWidth - scroll.clientWidth)));
            e_preventDefault(e);
            display.wheelStartX = null;
            return;
        }
        if (dy && wheelPixelsPerUnit != null) {
            var pixels = dy * wheelPixelsPerUnit;
            var top = cm.doc.scrollTop, bot = top + display.wrapper.clientHeight;
            if (pixels < 0) top = Math.max(0, top + pixels - 50); else bot = Math.min(cm.doc.height, bot + pixels + 50);
            updateDisplaySimple(cm, {
                top: top,
                bottom: bot
            });
        }
        if (wheelSamples < 20) {
            if (display.wheelStartX == null) {
                display.wheelStartX = scroll.scrollLeft;
                display.wheelStartY = scroll.scrollTop;
                display.wheelDX = dx;
                display.wheelDY = dy;
                setTimeout(function() {
                    if (display.wheelStartX == null) return;
                    var movedX = scroll.scrollLeft - display.wheelStartX;
                    var movedY = scroll.scrollTop - display.wheelStartY;
                    var sample = movedY && display.wheelDY && movedY / display.wheelDY || movedX && display.wheelDX && movedX / display.wheelDX;
                    display.wheelStartX = display.wheelStartY = null;
                    if (!sample) return;
                    wheelPixelsPerUnit = (wheelPixelsPerUnit * wheelSamples + sample) / (wheelSamples + 1);
                    ++wheelSamples;
                }, 200);
            } else {
                display.wheelDX += dx;
                display.wheelDY += dy;
            }
        }
    }
    function doHandleBinding(cm, bound, dropShift) {
        if (typeof bound == "string") {
            bound = commands[bound];
            if (!bound) return false;
        }
        if (cm.display.pollingFast && readInput(cm)) cm.display.pollingFast = false;
        var prevShift = cm.display.shift, done = false;
        try {
            if (isReadOnly(cm)) cm.state.suppressEdits = true;
            if (dropShift) cm.display.shift = false;
            done = bound(cm) != Pass;
        } finally {
            cm.display.shift = prevShift;
            cm.state.suppressEdits = false;
        }
        return done;
    }
    function lookupKeyForEditor(cm, name, handle) {
        for (var i = 0; i < cm.state.keyMaps.length; i++) {
            var result = lookupKey(name, cm.state.keyMaps[i], handle);
            if (result) return result;
        }
        return cm.options.extraKeys && lookupKey(name, cm.options.extraKeys, handle) || lookupKey(name, cm.options.keyMap, handle);
    }
    var stopSeq = new Delayed();
    function dispatchKey(cm, name, e, handle) {
        var seq = cm.state.keySeq;
        if (seq) {
            if (isModifierKey(name)) return "handled";
            stopSeq.set(50, function() {
                if (cm.state.keySeq == seq) {
                    cm.state.keySeq = null;
                    resetInput(cm);
                }
            });
            name = seq + " " + name;
        }
        var result = lookupKeyForEditor(cm, name, handle);
        if (result == "multi") cm.state.keySeq = name;
        if (result == "handled") signalLater(cm, "keyHandled", cm, name, e);
        if (result == "handled" || result == "multi") {
            e_preventDefault(e);
            restartBlink(cm);
        }
        if (seq && !result && /\'$/.test(name)) {
            e_preventDefault(e);
            return true;
        }
        return !!result;
    }
    function handleKeyBinding(cm, e) {
        var name = keyName(e, true);
        if (!name) return false;
        if (e.shiftKey && !cm.state.keySeq) {
            return dispatchKey(cm, "Shift-" + name, e, function(b) {
                return doHandleBinding(cm, b, true);
            }) || dispatchKey(cm, name, e, function(b) {
                if (typeof b == "string" ? /^go[A-Z]/.test(b) : b.motion) return doHandleBinding(cm, b);
            });
        } else {
            return dispatchKey(cm, name, e, function(b) {
                return doHandleBinding(cm, b);
            });
        }
    }
    function handleCharBinding(cm, e, ch) {
        return dispatchKey(cm, "'" + ch + "'", e, function(b) {
            return doHandleBinding(cm, b, true);
        });
    }
    var lastStoppedKey = null;
    function onKeyDown(e) {
        var cm = this;
        ensureFocus(cm);
        if (signalDOMEvent(cm, e)) return;
        if (ie && ie_version < 11 && e.keyCode == 27) e.returnValue = false;
        var code = e.keyCode;
        cm.display.shift = code == 16 || e.shiftKey;
        var handled = handleKeyBinding(cm, e);
        if (presto) {
            lastStoppedKey = handled ? code : null;
            if (!handled && code == 88 && !hasCopyEvent && (mac ? e.metaKey : e.ctrlKey)) cm.replaceSelection("", null, "cut");
        }
        if (code == 18 && !/\bCodeMirror-crosshair\b/.test(cm.display.lineDiv.className)) showCrossHair(cm);
    }
    function showCrossHair(cm) {
        var lineDiv = cm.display.lineDiv;
        addClass(lineDiv, "CodeMirror-crosshair");
        function up(e) {
            if (e.keyCode == 18 || !e.altKey) {
                rmClass(lineDiv, "CodeMirror-crosshair");
                off(document, "keyup", up);
                off(document, "mouseover", up);
            }
        }
        on(document, "keyup", up);
        on(document, "mouseover", up);
    }
    function onKeyUp(e) {
        if (e.keyCode == 16) this.doc.sel.shift = false;
        signalDOMEvent(this, e);
    }
    function onKeyPress(e) {
        var cm = this;
        if (signalDOMEvent(cm, e) || e.ctrlKey && !e.altKey || mac && e.metaKey) return;
        var keyCode = e.keyCode, charCode = e.charCode;
        if (presto && keyCode == lastStoppedKey) {
            lastStoppedKey = null;
            e_preventDefault(e);
            return;
        }
        if ((presto && (!e.which || e.which < 10) || khtml) && handleKeyBinding(cm, e)) return;
        var ch = String.fromCharCode(charCode == null ? keyCode : charCode);
        if (handleCharBinding(cm, e, ch)) return;
        if (ie && ie_version >= 9) cm.display.inputHasSelection = null;
        fastPoll(cm);
    }
    function onFocus(cm) {
        if (cm.options.readOnly == "nocursor") return;
        if (!cm.state.focused) {
            signal(cm, "focus", cm);
            cm.state.focused = true;
            addClass(cm.display.wrapper, "CodeMirror-focused");
            if (!cm.curOp && cm.display.selForContextMenu != cm.doc.sel) {
                resetInput(cm);
                if (webkit) setTimeout(bind(resetInput, cm, true), 0);
            }
        }
        slowPoll(cm);
        restartBlink(cm);
    }
    function onBlur(cm) {
        if (cm.state.focused) {
            signal(cm, "blur", cm);
            cm.state.focused = false;
            rmClass(cm.display.wrapper, "CodeMirror-focused");
        }
        clearInterval(cm.display.blinker);
        setTimeout(function() {
            if (!cm.state.focused) cm.display.shift = false;
        }, 150);
    }
    function onContextMenu(cm, e) {
        if (signalDOMEvent(cm, e, "contextmenu")) return;
        var display = cm.display;
        if (eventInWidget(display, e) || contextMenuInGutter(cm, e)) return;
        var pos = posFromMouse(cm, e), scrollPos = display.scroller.scrollTop;
        if (!pos || presto) return;
        var reset = cm.options.resetSelectionOnContextMenu;
        if (reset && cm.doc.sel.contains(pos) == -1) operation(cm, setSelection)(cm.doc, simpleSelection(pos), sel_dontScroll);
        var oldCSS = display.input.style.cssText;
        display.inputDiv.style.position = "absolute";
        display.input.style.cssText = "position: fixed; width: 30px; height: 30px; top: " + (e.clientY - 5) + "px; left: " + (e.clientX - 5) + "px; z-index: 1000; background: " + (ie ? "rgba(255, 255, 255, .05)" : "transparent") + "; outline: none; border-width: 0; outline: none; overflow: hidden; opacity: .05; filter: alpha(opacity=5);";
        if (webkit) var oldScrollY = window.scrollY;
        focusInput(cm);
        if (webkit) window.scrollTo(null, oldScrollY);
        resetInput(cm);
        if (!cm.somethingSelected()) display.input.value = display.prevInput = " ";
        display.selForContextMenu = cm.doc.sel;
        clearTimeout(display.detectingSelectAll);
        function prepareSelectAllHack() {
            if (display.input.selectionStart != null) {
                var selected = cm.somethingSelected();
                var extval = display.input.value = "​" + (selected ? display.input.value : "");
                display.prevInput = selected ? "" : "​";
                display.input.selectionStart = 1;
                display.input.selectionEnd = extval.length;
                display.selForContextMenu = cm.doc.sel;
            }
        }
        function rehide() {
            display.inputDiv.style.position = "relative";
            display.input.style.cssText = oldCSS;
            if (ie && ie_version < 9) display.scrollbarV.scrollTop = display.scroller.scrollTop = scrollPos;
            slowPoll(cm);
            if (display.input.selectionStart != null) {
                if (!ie || ie && ie_version < 9) prepareSelectAllHack();
                var i = 0, poll = function() {
                    if (display.selForContextMenu == cm.doc.sel && display.input.selectionStart == 0) operation(cm, commands.selectAll)(cm); else if (i++ < 10) display.detectingSelectAll = setTimeout(poll, 500); else resetInput(cm);
                };
                display.detectingSelectAll = setTimeout(poll, 200);
            }
        }
        if (ie && ie_version >= 9) prepareSelectAllHack();
        if (captureRightClick) {
            e_stop(e);
            var mouseup = function() {
                off(window, "mouseup", mouseup);
                setTimeout(rehide, 20);
            };
            on(window, "mouseup", mouseup);
        } else {
            setTimeout(rehide, 50);
        }
    }
    function contextMenuInGutter(cm, e) {
        if (!hasHandler(cm, "gutterContextMenu")) return false;
        return gutterEvent(cm, e, "gutterContextMenu", false, signal);
    }
    var changeEnd = CodeMirror.changeEnd = function(change) {
        if (!change.text) return change.to;
        return Pos(change.from.line + change.text.length - 1, lst(change.text).length + (change.text.length == 1 ? change.from.ch : 0));
    };
    function adjustForChange(pos, change) {
        if (cmp(pos, change.from) < 0) return pos;
        if (cmp(pos, change.to) <= 0) return changeEnd(change);
        var line = pos.line + change.text.length - (change.to.line - change.from.line) - 1, ch = pos.ch;
        if (pos.line == change.to.line) ch += changeEnd(change).ch - change.to.ch;
        return Pos(line, ch);
    }
    function computeSelAfterChange(doc, change) {
        var out = [];
        for (var i = 0; i < doc.sel.ranges.length; i++) {
            var range = doc.sel.ranges[i];
            out.push(new Range(adjustForChange(range.anchor, change), adjustForChange(range.head, change)));
        }
        return normalizeSelection(out, doc.sel.primIndex);
    }
    function offsetPos(pos, old, nw) {
        if (pos.line == old.line) return Pos(nw.line, pos.ch - old.ch + nw.ch); else return Pos(nw.line + (pos.line - old.line), pos.ch);
    }
    function computeReplacedSel(doc, changes, hint) {
        var out = [];
        var oldPrev = Pos(doc.first, 0), newPrev = oldPrev;
        for (var i = 0; i < changes.length; i++) {
            var change = changes[i];
            var from = offsetPos(change.from, oldPrev, newPrev);
            var to = offsetPos(changeEnd(change), oldPrev, newPrev);
            oldPrev = change.to;
            newPrev = to;
            if (hint == "around") {
                var range = doc.sel.ranges[i], inv = cmp(range.head, range.anchor) < 0;
                out[i] = new Range(inv ? to : from, inv ? from : to);
            } else {
                out[i] = new Range(from, from);
            }
        }
        return new Selection(out, doc.sel.primIndex);
    }
    function filterChange(doc, change, update) {
        var obj = {
            canceled: false,
            from: change.from,
            to: change.to,
            text: change.text,
            origin: change.origin,
            cancel: function() {
                this.canceled = true;
            }
        };
        if (update) obj.update = function(from, to, text, origin) {
            if (from) this.from = clipPos(doc, from);
            if (to) this.to = clipPos(doc, to);
            if (text) this.text = text;
            if (origin !== undefined) this.origin = origin;
        };
        signal(doc, "beforeChange", doc, obj);
        if (doc.cm) signal(doc.cm, "beforeChange", doc.cm, obj);
        if (obj.canceled) return null;
        return {
            from: obj.from,
            to: obj.to,
            text: obj.text,
            origin: obj.origin
        };
    }
    function makeChange(doc, change, ignoreReadOnly) {
        if (doc.cm) {
            if (!doc.cm.curOp) return operation(doc.cm, makeChange)(doc, change, ignoreReadOnly);
            if (doc.cm.state.suppressEdits) return;
        }
        if (hasHandler(doc, "beforeChange") || doc.cm && hasHandler(doc.cm, "beforeChange")) {
            change = filterChange(doc, change, true);
            if (!change) return;
        }
        var split = sawReadOnlySpans && !ignoreReadOnly && removeReadOnlyRanges(doc, change.from, change.to);
        if (split) {
            for (var i = split.length - 1; i >= 0; --i) makeChangeInner(doc, {
                from: split[i].from,
                to: split[i].to,
                text: i ? [ "" ] : change.text
            });
        } else {
            makeChangeInner(doc, change);
        }
    }
    function makeChangeInner(doc, change) {
        if (change.text.length == 1 && change.text[0] == "" && cmp(change.from, change.to) == 0) return;
        var selAfter = computeSelAfterChange(doc, change);
        addChangeToHistory(doc, change, selAfter, doc.cm ? doc.cm.curOp.id : NaN);
        makeChangeSingleDoc(doc, change, selAfter, stretchSpansOverChange(doc, change));
        var rebased = [];
        linkedDocs(doc, function(doc, sharedHist) {
            if (!sharedHist && indexOf(rebased, doc.history) == -1) {
                rebaseHist(doc.history, change);
                rebased.push(doc.history);
            }
            makeChangeSingleDoc(doc, change, null, stretchSpansOverChange(doc, change));
        });
    }
    function makeChangeFromHistory(doc, type, allowSelectionOnly) {
        if (doc.cm && doc.cm.state.suppressEdits) return;
        var hist = doc.history, event, selAfter = doc.sel;
        var source = type == "undo" ? hist.done : hist.undone, dest = type == "undo" ? hist.undone : hist.done;
        for (var i = 0; i < source.length; i++) {
            event = source[i];
            if (allowSelectionOnly ? event.ranges && !event.equals(doc.sel) : !event.ranges) break;
        }
        if (i == source.length) return;
        hist.lastOrigin = hist.lastSelOrigin = null;
        for (;;) {
            event = source.pop();
            if (event.ranges) {
                pushSelectionToHistory(event, dest);
                if (allowSelectionOnly && !event.equals(doc.sel)) {
                    setSelection(doc, event, {
                        clearRedo: false
                    });
                    return;
                }
                selAfter = event;
            } else break;
        }
        var antiChanges = [];
        pushSelectionToHistory(selAfter, dest);
        dest.push({
            changes: antiChanges,
            generation: hist.generation
        });
        hist.generation = event.generation || ++hist.maxGeneration;
        var filter = hasHandler(doc, "beforeChange") || doc.cm && hasHandler(doc.cm, "beforeChange");
        for (var i = event.changes.length - 1; i >= 0; --i) {
            var change = event.changes[i];
            change.origin = type;
            if (filter && !filterChange(doc, change, false)) {
                source.length = 0;
                return;
            }
            antiChanges.push(historyChangeFromChange(doc, change));
            var after = i ? computeSelAfterChange(doc, change) : lst(source);
            makeChangeSingleDoc(doc, change, after, mergeOldSpans(doc, change));
            if (!i && doc.cm) doc.cm.scrollIntoView({
                from: change.from,
                to: changeEnd(change)
            });
            var rebased = [];
            linkedDocs(doc, function(doc, sharedHist) {
                if (!sharedHist && indexOf(rebased, doc.history) == -1) {
                    rebaseHist(doc.history, change);
                    rebased.push(doc.history);
                }
                makeChangeSingleDoc(doc, change, null, mergeOldSpans(doc, change));
            });
        }
    }
    function shiftDoc(doc, distance) {
        if (distance == 0) return;
        doc.first += distance;
        doc.sel = new Selection(map(doc.sel.ranges, function(range) {
            return new Range(Pos(range.anchor.line + distance, range.anchor.ch), Pos(range.head.line + distance, range.head.ch));
        }), doc.sel.primIndex);
        if (doc.cm) {
            regChange(doc.cm, doc.first, doc.first - distance, distance);
            for (var d = doc.cm.display, l = d.viewFrom; l < d.viewTo; l++) regLineChange(doc.cm, l, "gutter");
        }
    }
    function makeChangeSingleDoc(doc, change, selAfter, spans) {
        if (doc.cm && !doc.cm.curOp) return operation(doc.cm, makeChangeSingleDoc)(doc, change, selAfter, spans);
        if (change.to.line < doc.first) {
            shiftDoc(doc, change.text.length - 1 - (change.to.line - change.from.line));
            return;
        }
        if (change.from.line > doc.lastLine()) return;
        if (change.from.line < doc.first) {
            var shift = change.text.length - 1 - (doc.first - change.from.line);
            shiftDoc(doc, shift);
            change = {
                from: Pos(doc.first, 0),
                to: Pos(change.to.line + shift, change.to.ch),
                text: [ lst(change.text) ],
                origin: change.origin
            };
        }
        var last = doc.lastLine();
        if (change.to.line > last) {
            change = {
                from: change.from,
                to: Pos(last, getLine(doc, last).text.length),
                text: [ change.text[0] ],
                origin: change.origin
            };
        }
        change.removed = getBetween(doc, change.from, change.to);
        if (!selAfter) selAfter = computeSelAfterChange(doc, change);
        if (doc.cm) makeChangeSingleDocInEditor(doc.cm, change, spans); else updateDoc(doc, change, spans);
        setSelectionNoUndo(doc, selAfter, sel_dontScroll);
    }
    function makeChangeSingleDocInEditor(cm, change, spans) {
        var doc = cm.doc, display = cm.display, from = change.from, to = change.to;
        var recomputeMaxLength = false, checkWidthStart = from.line;
        if (!cm.options.lineWrapping) {
            checkWidthStart = lineNo(visualLine(getLine(doc, from.line)));
            doc.iter(checkWidthStart, to.line + 1, function(line) {
                if (line == display.maxLine) {
                    recomputeMaxLength = true;
                    return true;
                }
            });
        }
        if (doc.sel.contains(change.from, change.to) > -1) signalCursorActivity(cm);
        updateDoc(doc, change, spans, estimateHeight(cm));
        if (!cm.options.lineWrapping) {
            doc.iter(checkWidthStart, from.line + change.text.length, function(line) {
                var len = lineLength(line);
                if (len > display.maxLineLength) {
                    display.maxLine = line;
                    display.maxLineLength = len;
                    display.maxLineChanged = true;
                    recomputeMaxLength = false;
                }
            });
            if (recomputeMaxLength) cm.curOp.updateMaxLine = true;
        }
        doc.frontier = Math.min(doc.frontier, from.line);
        startWorker(cm, 400);
        var lendiff = change.text.length - (to.line - from.line) - 1;
        if (from.line == to.line && change.text.length == 1 && !isWholeLineUpdate(cm.doc, change)) regLineChange(cm, from.line, "text"); else regChange(cm, from.line, to.line + 1, lendiff);
        var changesHandler = hasHandler(cm, "changes"), changeHandler = hasHandler(cm, "change");
        if (changeHandler || changesHandler) {
            var obj = {
                from: from,
                to: to,
                text: change.text,
                removed: change.removed,
                origin: change.origin
            };
            if (changeHandler) signalLater(cm, "change", cm, obj);
            if (changesHandler) (cm.curOp.changeObjs || (cm.curOp.changeObjs = [])).push(obj);
        }
        cm.display.selForContextMenu = null;
    }
    function replaceRange(doc, code, from, to, origin) {
        if (!to) to = from;
        if (cmp(to, from) < 0) {
            var tmp = to;
            to = from;
            from = tmp;
        }
        if (typeof code == "string") code = splitLines(code);
        makeChange(doc, {
            from: from,
            to: to,
            text: code,
            origin: origin
        });
    }
    function maybeScrollWindow(cm, coords) {
        if (signalDOMEvent(cm, "scrollCursorIntoView")) return;
        var display = cm.display, box = display.sizer.getBoundingClientRect(), doScroll = null;
        if (coords.top + box.top < 0) doScroll = true; else if (coords.bottom + box.top > (window.innerHeight || document.documentElement.clientHeight)) doScroll = false;
        if (doScroll != null && !phantom) {
            var scrollNode = elt("div", "​", null, "position: absolute; top: " + (coords.top - display.viewOffset - paddingTop(cm.display)) + "px; height: " + (coords.bottom - coords.top + scrollerCutOff) + "px; left: " + coords.left + "px; width: 2px;");
            cm.display.lineSpace.appendChild(scrollNode);
            scrollNode.scrollIntoView(doScroll);
            cm.display.lineSpace.removeChild(scrollNode);
        }
    }
    function scrollPosIntoView(cm, pos, end, margin) {
        if (margin == null) margin = 0;
        for (var limit = 0; limit < 5; limit++) {
            var changed = false, coords = cursorCoords(cm, pos);
            var endCoords = !end || end == pos ? coords : cursorCoords(cm, end);
            var scrollPos = calculateScrollPos(cm, Math.min(coords.left, endCoords.left), Math.min(coords.top, endCoords.top) - margin, Math.max(coords.left, endCoords.left), Math.max(coords.bottom, endCoords.bottom) + margin);
            var startTop = cm.doc.scrollTop, startLeft = cm.doc.scrollLeft;
            if (scrollPos.scrollTop != null) {
                setScrollTop(cm, scrollPos.scrollTop);
                if (Math.abs(cm.doc.scrollTop - startTop) > 1) changed = true;
            }
            if (scrollPos.scrollLeft != null) {
                setScrollLeft(cm, scrollPos.scrollLeft);
                if (Math.abs(cm.doc.scrollLeft - startLeft) > 1) changed = true;
            }
            if (!changed) return coords;
        }
    }
    function scrollIntoView(cm, x1, y1, x2, y2) {
        var scrollPos = calculateScrollPos(cm, x1, y1, x2, y2);
        if (scrollPos.scrollTop != null) setScrollTop(cm, scrollPos.scrollTop);
        if (scrollPos.scrollLeft != null) setScrollLeft(cm, scrollPos.scrollLeft);
    }
    function calculateScrollPos(cm, x1, y1, x2, y2) {
        var display = cm.display, snapMargin = textHeight(cm.display);
        if (y1 < 0) y1 = 0;
        var screentop = cm.curOp && cm.curOp.scrollTop != null ? cm.curOp.scrollTop : display.scroller.scrollTop;
        var screen = display.scroller.clientHeight - scrollerCutOff, result = {};
        if (y2 - y1 > screen) y2 = y1 + screen;
        var docBottom = cm.doc.height + paddingVert(display);
        var atTop = y1 < snapMargin, atBottom = y2 > docBottom - snapMargin;
        if (y1 < screentop) {
            result.scrollTop = atTop ? 0 : y1;
        } else if (y2 > screentop + screen) {
            var newTop = Math.min(y1, (atBottom ? docBottom : y2) - screen);
            if (newTop != screentop) result.scrollTop = newTop;
        }
        var screenleft = cm.curOp && cm.curOp.scrollLeft != null ? cm.curOp.scrollLeft : display.scroller.scrollLeft;
        var screenw = display.scroller.clientWidth - scrollerCutOff - display.gutters.offsetWidth;
        var tooWide = x2 - x1 > screenw;
        if (tooWide) x2 = x1 + screenw;
        if (x1 < 10) result.scrollLeft = 0; else if (x1 < screenleft) result.scrollLeft = Math.max(0, x1 - (tooWide ? 0 : 10)); else if (x2 > screenw + screenleft - 3) result.scrollLeft = x2 + (tooWide ? 0 : 10) - screenw;
        return result;
    }
    function addToScrollPos(cm, left, top) {
        if (left != null || top != null) resolveScrollToPos(cm);
        if (left != null) cm.curOp.scrollLeft = (cm.curOp.scrollLeft == null ? cm.doc.scrollLeft : cm.curOp.scrollLeft) + left;
        if (top != null) cm.curOp.scrollTop = (cm.curOp.scrollTop == null ? cm.doc.scrollTop : cm.curOp.scrollTop) + top;
    }
    function ensureCursorVisible(cm) {
        resolveScrollToPos(cm);
        var cur = cm.getCursor(), from = cur, to = cur;
        if (!cm.options.lineWrapping) {
            from = cur.ch ? Pos(cur.line, cur.ch - 1) : cur;
            to = Pos(cur.line, cur.ch + 1);
        }
        cm.curOp.scrollToPos = {
            from: from,
            to: to,
            margin: cm.options.cursorScrollMargin,
            isCursor: true
        };
    }
    function resolveScrollToPos(cm) {
        var range = cm.curOp.scrollToPos;
        if (range) {
            cm.curOp.scrollToPos = null;
            var from = estimateCoords(cm, range.from), to = estimateCoords(cm, range.to);
            var sPos = calculateScrollPos(cm, Math.min(from.left, to.left), Math.min(from.top, to.top) - range.margin, Math.max(from.right, to.right), Math.max(from.bottom, to.bottom) + range.margin);
            cm.scrollTo(sPos.scrollLeft, sPos.scrollTop);
        }
    }
    function indentLine(cm, n, how, aggressive) {
        var doc = cm.doc, state;
        if (how == null) how = "add";
        if (how == "smart") {
            if (!doc.mode.indent) how = "prev"; else state = getStateBefore(cm, n);
        }
        var tabSize = cm.options.tabSize;
        var line = getLine(doc, n), curSpace = countColumn(line.text, null, tabSize);
        if (line.stateAfter) line.stateAfter = null;
        var curSpaceString = line.text.match(/^\s*/)[0], indentation;
        if (!aggressive && !/\S/.test(line.text)) {
            indentation = 0;
            how = "not";
        } else if (how == "smart") {
            indentation = doc.mode.indent(state, line.text.slice(curSpaceString.length), line.text);
            if (indentation == Pass || indentation > 150) {
                if (!aggressive) return;
                how = "prev";
            }
        }
        if (how == "prev") {
            if (n > doc.first) indentation = countColumn(getLine(doc, n - 1).text, null, tabSize); else indentation = 0;
        } else if (how == "add") {
            indentation = curSpace + cm.options.indentUnit;
        } else if (how == "subtract") {
            indentation = curSpace - cm.options.indentUnit;
        } else if (typeof how == "number") {
            indentation = curSpace + how;
        }
        indentation = Math.max(0, indentation);
        var indentString = "", pos = 0;
        if (cm.options.indentWithTabs) for (var i = Math.floor(indentation / tabSize); i; --i) {
            pos += tabSize;
            indentString += "\t";
        }
        if (pos < indentation) indentString += spaceStr(indentation - pos);
        if (indentString != curSpaceString) {
            replaceRange(doc, indentString, Pos(n, 0), Pos(n, curSpaceString.length), "+input");
        } else {
            for (var i = 0; i < doc.sel.ranges.length; i++) {
                var range = doc.sel.ranges[i];
                if (range.head.line == n && range.head.ch < curSpaceString.length) {
                    var pos = Pos(n, curSpaceString.length);
                    replaceOneSelection(doc, i, new Range(pos, pos));
                    break;
                }
            }
        }
        line.stateAfter = null;
    }
    function changeLine(doc, handle, changeType, op) {
        var no = handle, line = handle;
        if (typeof handle == "number") line = getLine(doc, clipLine(doc, handle)); else no = lineNo(handle);
        if (no == null) return null;
        if (op(line, no) && doc.cm) regLineChange(doc.cm, no, changeType);
        return line;
    }
    function deleteNearSelection(cm, compute) {
        var ranges = cm.doc.sel.ranges, kill = [];
        for (var i = 0; i < ranges.length; i++) {
            var toKill = compute(ranges[i]);
            while (kill.length && cmp(toKill.from, lst(kill).to) <= 0) {
                var replaced = kill.pop();
                if (cmp(replaced.from, toKill.from) < 0) {
                    toKill.from = replaced.from;
                    break;
                }
            }
            kill.push(toKill);
        }
        runInOp(cm, function() {
            for (var i = kill.length - 1; i >= 0; i--) replaceRange(cm.doc, "", kill[i].from, kill[i].to, "+delete");
            ensureCursorVisible(cm);
        });
    }
    function findPosH(doc, pos, dir, unit, visually) {
        var line = pos.line, ch = pos.ch, origDir = dir;
        var lineObj = getLine(doc, line);
        var possible = true;
        function findNextLine() {
            var l = line + dir;
            if (l < doc.first || l >= doc.first + doc.size) return possible = false;
            line = l;
            return lineObj = getLine(doc, l);
        }
        function moveOnce(boundToLine) {
            var next = (visually ? moveVisually : moveLogically)(lineObj, ch, dir, true);
            if (next == null) {
                if (!boundToLine && findNextLine()) {
                    if (visually) ch = (dir < 0 ? lineRight : lineLeft)(lineObj); else ch = dir < 0 ? lineObj.text.length : 0;
                } else return possible = false;
            } else ch = next;
            return true;
        }
        if (unit == "char") moveOnce(); else if (unit == "column") moveOnce(true); else if (unit == "word" || unit == "group") {
            var sawType = null, group = unit == "group";
            var helper = doc.cm && doc.cm.getHelper(pos, "wordChars");
            for (var first = true; ;first = false) {
                if (dir < 0 && !moveOnce(!first)) break;
                var cur = lineObj.text.charAt(ch) || "\n";
                var type = isWordChar(cur, helper) ? "w" : group && cur == "\n" ? "n" : !group || /\s/.test(cur) ? null : "p";
                if (group && !first && !type) type = "s";
                if (sawType && sawType != type) {
                    if (dir < 0) {
                        dir = 1;
                        moveOnce();
                    }
                    break;
                }
                if (type) sawType = type;
                if (dir > 0 && !moveOnce(!first)) break;
            }
        }
        var result = skipAtomic(doc, Pos(line, ch), origDir, true);
        if (!possible) result.hitSide = true;
        return result;
    }
    function findPosV(cm, pos, dir, unit) {
        var doc = cm.doc, x = pos.left, y;
        if (unit == "page") {
            var pageSize = Math.min(cm.display.wrapper.clientHeight, window.innerHeight || document.documentElement.clientHeight);
            y = pos.top + dir * (pageSize - (dir < 0 ? 1.5 : .5) * textHeight(cm.display));
        } else if (unit == "line") {
            y = dir > 0 ? pos.bottom + 3 : pos.top - 3;
        }
        for (;;) {
            var target = coordsChar(cm, x, y);
            if (!target.outside) break;
            if (dir < 0 ? y <= 0 : y >= doc.height) {
                target.hitSide = true;
                break;
            }
            y += dir * 5;
        }
        return target;
    }
    CodeMirror.prototype = {
        constructor: CodeMirror,
        focus: function() {
            window.focus();
            focusInput(this);
            fastPoll(this);
        },
        setOption: function(option, value) {
            var options = this.options, old = options[option];
            if (options[option] == value && option != "mode") return;
            options[option] = value;
            if (optionHandlers.hasOwnProperty(option)) operation(this, optionHandlers[option])(this, value, old);
        },
        getOption: function(option) {
            return this.options[option];
        },
        getDoc: function() {
            return this.doc;
        },
        addKeyMap: function(map, bottom) {
            this.state.keyMaps[bottom ? "push" : "unshift"](getKeyMap(map));
        },
        removeKeyMap: function(map) {
            var maps = this.state.keyMaps;
            for (var i = 0; i < maps.length; ++i) if (maps[i] == map || maps[i].name == map) {
                maps.splice(i, 1);
                return true;
            }
        },
        addOverlay: methodOp(function(spec, options) {
            var mode = spec.token ? spec : CodeMirror.getMode(this.options, spec);
            if (mode.startState) throw new Error("Overlays may not be stateful.");
            this.state.overlays.push({
                mode: mode,
                modeSpec: spec,
                opaque: options && options.opaque
            });
            this.state.modeGen++;
            regChange(this);
        }),
        removeOverlay: methodOp(function(spec) {
            var overlays = this.state.overlays;
            for (var i = 0; i < overlays.length; ++i) {
                var cur = overlays[i].modeSpec;
                if (cur == spec || typeof spec == "string" && cur.name == spec) {
                    overlays.splice(i, 1);
                    this.state.modeGen++;
                    regChange(this);
                    return;
                }
            }
        }),
        indentLine: methodOp(function(n, dir, aggressive) {
            if (typeof dir != "string" && typeof dir != "number") {
                if (dir == null) dir = this.options.smartIndent ? "smart" : "prev"; else dir = dir ? "add" : "subtract";
            }
            if (isLine(this.doc, n)) indentLine(this, n, dir, aggressive);
        }),
        indentSelection: methodOp(function(how) {
            var ranges = this.doc.sel.ranges, end = -1;
            for (var i = 0; i < ranges.length; i++) {
                var range = ranges[i];
                if (!range.empty()) {
                    var from = range.from(), to = range.to();
                    var start = Math.max(end, from.line);
                    end = Math.min(this.lastLine(), to.line - (to.ch ? 0 : 1)) + 1;
                    for (var j = start; j < end; ++j) indentLine(this, j, how);
                    var newRanges = this.doc.sel.ranges;
                    if (from.ch == 0 && ranges.length == newRanges.length && newRanges[i].from().ch > 0) replaceOneSelection(this.doc, i, new Range(from, newRanges[i].to()), sel_dontScroll);
                } else if (range.head.line > end) {
                    indentLine(this, range.head.line, how, true);
                    end = range.head.line;
                    if (i == this.doc.sel.primIndex) ensureCursorVisible(this);
                }
            }
        }),
        getTokenAt: function(pos, precise) {
            return takeToken(this, pos, precise);
        },
        getLineTokens: function(line, precise) {
            return takeToken(this, Pos(line), precise, true);
        },
        getTokenTypeAt: function(pos) {
            pos = clipPos(this.doc, pos);
            var styles = getLineStyles(this, getLine(this.doc, pos.line));
            var before = 0, after = (styles.length - 1) / 2, ch = pos.ch;
            var type;
            if (ch == 0) type = styles[2]; else for (;;) {
                var mid = before + after >> 1;
                if ((mid ? styles[mid * 2 - 1] : 0) >= ch) after = mid; else if (styles[mid * 2 + 1] < ch) before = mid + 1; else {
                    type = styles[mid * 2 + 2];
                    break;
                }
            }
            var cut = type ? type.indexOf("cm-overlay ") : -1;
            return cut < 0 ? type : cut == 0 ? null : type.slice(0, cut - 1);
        },
        getModeAt: function(pos) {
            var mode = this.doc.mode;
            if (!mode.innerMode) return mode;
            return CodeMirror.innerMode(mode, this.getTokenAt(pos).state).mode;
        },
        getHelper: function(pos, type) {
            return this.getHelpers(pos, type)[0];
        },
        getHelpers: function(pos, type) {
            var found = [];
            if (!helpers.hasOwnProperty(type)) return helpers;
            var help = helpers[type], mode = this.getModeAt(pos);
            if (typeof mode[type] == "string") {
                if (help[mode[type]]) found.push(help[mode[type]]);
            } else if (mode[type]) {
                for (var i = 0; i < mode[type].length; i++) {
                    var val = help[mode[type][i]];
                    if (val) found.push(val);
                }
            } else if (mode.helperType && help[mode.helperType]) {
                found.push(help[mode.helperType]);
            } else if (help[mode.name]) {
                found.push(help[mode.name]);
            }
            for (var i = 0; i < help._global.length; i++) {
                var cur = help._global[i];
                if (cur.pred(mode, this) && indexOf(found, cur.val) == -1) found.push(cur.val);
            }
            return found;
        },
        getStateAfter: function(line, precise) {
            var doc = this.doc;
            line = clipLine(doc, line == null ? doc.first + doc.size - 1 : line);
            return getStateBefore(this, line + 1, precise);
        },
        cursorCoords: function(start, mode) {
            var pos, range = this.doc.sel.primary();
            if (start == null) pos = range.head; else if (typeof start == "object") pos = clipPos(this.doc, start); else pos = start ? range.from() : range.to();
            return cursorCoords(this, pos, mode || "page");
        },
        charCoords: function(pos, mode) {
            return charCoords(this, clipPos(this.doc, pos), mode || "page");
        },
        coordsChar: function(coords, mode) {
            coords = fromCoordSystem(this, coords, mode || "page");
            return coordsChar(this, coords.left, coords.top);
        },
        lineAtHeight: function(height, mode) {
            height = fromCoordSystem(this, {
                top: height,
                left: 0
            }, mode || "page").top;
            return lineAtHeight(this.doc, height + this.display.viewOffset);
        },
        heightAtLine: function(line, mode) {
            var end = false, last = this.doc.first + this.doc.size - 1;
            if (line < this.doc.first) line = this.doc.first; else if (line > last) {
                line = last;
                end = true;
            }
            var lineObj = getLine(this.doc, line);
            return intoCoordSystem(this, lineObj, {
                top: 0,
                left: 0
            }, mode || "page").top + (end ? this.doc.height - heightAtLine(lineObj) : 0);
        },
        defaultTextHeight: function() {
            return textHeight(this.display);
        },
        defaultCharWidth: function() {
            return charWidth(this.display);
        },
        setGutterMarker: methodOp(function(line, gutterID, value) {
            return changeLine(this.doc, line, "gutter", function(line) {
                var markers = line.gutterMarkers || (line.gutterMarkers = {});
                markers[gutterID] = value;
                if (!value && isEmpty(markers)) line.gutterMarkers = null;
                return true;
            });
        }),
        clearGutter: methodOp(function(gutterID) {
            var cm = this, doc = cm.doc, i = doc.first;
            doc.iter(function(line) {
                if (line.gutterMarkers && line.gutterMarkers[gutterID]) {
                    line.gutterMarkers[gutterID] = null;
                    regLineChange(cm, i, "gutter");
                    if (isEmpty(line.gutterMarkers)) line.gutterMarkers = null;
                }
                ++i;
            });
        }),
        addLineWidget: methodOp(function(handle, node, options) {
            return addLineWidget(this, handle, node, options);
        }),
        removeLineWidget: function(widget) {
            widget.clear();
        },
        lineInfo: function(line) {
            if (typeof line == "number") {
                if (!isLine(this.doc, line)) return null;
                var n = line;
                line = getLine(this.doc, line);
                if (!line) return null;
            } else {
                var n = lineNo(line);
                if (n == null) return null;
            }
            return {
                line: n,
                handle: line,
                text: line.text,
                gutterMarkers: line.gutterMarkers,
                textClass: line.textClass,
                bgClass: line.bgClass,
                wrapClass: line.wrapClass,
                widgets: line.widgets
            };
        },
        getViewport: function() {
            return {
                from: this.display.viewFrom,
                to: this.display.viewTo
            };
        },
        addWidget: function(pos, node, scroll, vert, horiz) {
            var display = this.display;
            pos = cursorCoords(this, clipPos(this.doc, pos));
            var top = pos.bottom, left = pos.left;
            node.style.position = "absolute";
            display.sizer.appendChild(node);
            if (vert == "over") {
                top = pos.top;
            } else if (vert == "above" || vert == "near") {
                var vspace = Math.max(display.wrapper.clientHeight, this.doc.height), hspace = Math.max(display.sizer.clientWidth, display.lineSpace.clientWidth);
                if ((vert == "above" || pos.bottom + node.offsetHeight > vspace) && pos.top > node.offsetHeight) top = pos.top - node.offsetHeight; else if (pos.bottom + node.offsetHeight <= vspace) top = pos.bottom;
                if (left + node.offsetWidth > hspace) left = hspace - node.offsetWidth;
            }
            node.style.top = top + "px";
            node.style.left = node.style.right = "";
            if (horiz == "right") {
                left = display.sizer.clientWidth - node.offsetWidth;
                node.style.right = "0px";
            } else {
                if (horiz == "left") left = 0; else if (horiz == "middle") left = (display.sizer.clientWidth - node.offsetWidth) / 2;
                node.style.left = left + "px";
            }
            if (scroll) scrollIntoView(this, left, top, left + node.offsetWidth, top + node.offsetHeight);
        },
        triggerOnKeyDown: methodOp(onKeyDown),
        triggerOnKeyPress: methodOp(onKeyPress),
        triggerOnKeyUp: onKeyUp,
        execCommand: function(cmd) {
            if (commands.hasOwnProperty(cmd)) return commands[cmd](this);
        },
        findPosH: function(from, amount, unit, visually) {
            var dir = 1;
            if (amount < 0) {
                dir = -1;
                amount = -amount;
            }
            for (var i = 0, cur = clipPos(this.doc, from); i < amount; ++i) {
                cur = findPosH(this.doc, cur, dir, unit, visually);
                if (cur.hitSide) break;
            }
            return cur;
        },
        moveH: methodOp(function(dir, unit) {
            var cm = this;
            cm.extendSelectionsBy(function(range) {
                if (cm.display.shift || cm.doc.extend || range.empty()) return findPosH(cm.doc, range.head, dir, unit, cm.options.rtlMoveVisually); else return dir < 0 ? range.from() : range.to();
            }, sel_move);
        }),
        deleteH: methodOp(function(dir, unit) {
            var sel = this.doc.sel, doc = this.doc;
            if (sel.somethingSelected()) doc.replaceSelection("", null, "+delete"); else deleteNearSelection(this, function(range) {
                var other = findPosH(doc, range.head, dir, unit, false);
                return dir < 0 ? {
                    from: other,
                    to: range.head
                } : {
                    from: range.head,
                    to: other
                };
            });
        }),
        findPosV: function(from, amount, unit, goalColumn) {
            var dir = 1, x = goalColumn;
            if (amount < 0) {
                dir = -1;
                amount = -amount;
            }
            for (var i = 0, cur = clipPos(this.doc, from); i < amount; ++i) {
                var coords = cursorCoords(this, cur, "div");
                if (x == null) x = coords.left; else coords.left = x;
                cur = findPosV(this, coords, dir, unit);
                if (cur.hitSide) break;
            }
            return cur;
        },
        moveV: methodOp(function(dir, unit) {
            var cm = this, doc = this.doc, goals = [];
            var collapse = !cm.display.shift && !doc.extend && doc.sel.somethingSelected();
            doc.extendSelectionsBy(function(range) {
                if (collapse) return dir < 0 ? range.from() : range.to();
                var headPos = cursorCoords(cm, range.head, "div");
                if (range.goalColumn != null) headPos.left = range.goalColumn;
                goals.push(headPos.left);
                var pos = findPosV(cm, headPos, dir, unit);
                if (unit == "page" && range == doc.sel.primary()) addToScrollPos(cm, null, charCoords(cm, pos, "div").top - headPos.top);
                return pos;
            }, sel_move);
            if (goals.length) for (var i = 0; i < doc.sel.ranges.length; i++) doc.sel.ranges[i].goalColumn = goals[i];
        }),
        findWordAt: function(pos) {
            var doc = this.doc, line = getLine(doc, pos.line).text;
            var start = pos.ch, end = pos.ch;
            if (line) {
                var helper = this.getHelper(pos, "wordChars");
                if ((pos.xRel < 0 || end == line.length) && start) --start; else ++end;
                var startChar = line.charAt(start);
                var check = isWordChar(startChar, helper) ? function(ch) {
                    return isWordChar(ch, helper);
                } : /\s/.test(startChar) ? function(ch) {
                    return /\s/.test(ch);
                } : function(ch) {
                    return !/\s/.test(ch) && !isWordChar(ch);
                };
                while (start > 0 && check(line.charAt(start - 1))) --start;
                while (end < line.length && check(line.charAt(end))) ++end;
            }
            return new Range(Pos(pos.line, start), Pos(pos.line, end));
        },
        toggleOverwrite: function(value) {
            if (value != null && value == this.state.overwrite) return;
            if (this.state.overwrite = !this.state.overwrite) addClass(this.display.cursorDiv, "CodeMirror-overwrite"); else rmClass(this.display.cursorDiv, "CodeMirror-overwrite");
            signal(this, "overwriteToggle", this, this.state.overwrite);
        },
        hasFocus: function() {
            return activeElt() == this.display.input;
        },
        scrollTo: methodOp(function(x, y) {
            if (x != null || y != null) resolveScrollToPos(this);
            if (x != null) this.curOp.scrollLeft = x;
            if (y != null) this.curOp.scrollTop = y;
        }),
        getScrollInfo: function() {
            var scroller = this.display.scroller, co = scrollerCutOff;
            return {
                left: scroller.scrollLeft,
                top: scroller.scrollTop,
                height: scroller.scrollHeight - co,
                width: scroller.scrollWidth - co,
                clientHeight: scroller.clientHeight - co,
                clientWidth: scroller.clientWidth - co
            };
        },
        scrollIntoView: methodOp(function(range, margin) {
            if (range == null) {
                range = {
                    from: this.doc.sel.primary().head,
                    to: null
                };
                if (margin == null) margin = this.options.cursorScrollMargin;
            } else if (typeof range == "number") {
                range = {
                    from: Pos(range, 0),
                    to: null
                };
            } else if (range.from == null) {
                range = {
                    from: range,
                    to: null
                };
            }
            if (!range.to) range.to = range.from;
            range.margin = margin || 0;
            if (range.from.line != null) {
                resolveScrollToPos(this);
                this.curOp.scrollToPos = range;
            } else {
                var sPos = calculateScrollPos(this, Math.min(range.from.left, range.to.left), Math.min(range.from.top, range.to.top) - range.margin, Math.max(range.from.right, range.to.right), Math.max(range.from.bottom, range.to.bottom) + range.margin);
                this.scrollTo(sPos.scrollLeft, sPos.scrollTop);
            }
        }),
        setSize: methodOp(function(width, height) {
            var cm = this;
            function interpret(val) {
                return typeof val == "number" || /^\d+$/.test(String(val)) ? val + "px" : val;
            }
            if (width != null) cm.display.wrapper.style.width = interpret(width);
            if (height != null) cm.display.wrapper.style.height = interpret(height);
            if (cm.options.lineWrapping) clearLineMeasurementCache(this);
            var lineNo = cm.display.viewFrom;
            cm.doc.iter(lineNo, cm.display.viewTo, function(line) {
                if (line.widgets) for (var i = 0; i < line.widgets.length; i++) if (line.widgets[i].noHScroll) {
                    regLineChange(cm, lineNo, "widget");
                    break;
                }
                ++lineNo;
            });
            cm.curOp.forceUpdate = true;
            signal(cm, "refresh", this);
        }),
        operation: function(f) {
            return runInOp(this, f);
        },
        refresh: methodOp(function() {
            var oldHeight = this.display.cachedTextHeight;
            regChange(this);
            this.curOp.forceUpdate = true;
            clearCaches(this);
            this.scrollTo(this.doc.scrollLeft, this.doc.scrollTop);
            updateGutterSpace(this);
            if (oldHeight == null || Math.abs(oldHeight - textHeight(this.display)) > .5) estimateLineHeights(this);
            signal(this, "refresh", this);
        }),
        swapDoc: methodOp(function(doc) {
            var old = this.doc;
            old.cm = null;
            attachDoc(this, doc);
            clearCaches(this);
            resetInput(this);
            this.scrollTo(doc.scrollLeft, doc.scrollTop);
            this.curOp.forceScroll = true;
            signalLater(this, "swapDoc", this, old);
            return old;
        }),
        getInputField: function() {
            return this.display.input;
        },
        getWrapperElement: function() {
            return this.display.wrapper;
        },
        getScrollerElement: function() {
            return this.display.scroller;
        },
        getGutterElement: function() {
            return this.display.gutters;
        }
    };
    eventMixin(CodeMirror);
    var defaults = CodeMirror.defaults = {};
    var optionHandlers = CodeMirror.optionHandlers = {};
    function option(name, deflt, handle, notOnInit) {
        CodeMirror.defaults[name] = deflt;
        if (handle) optionHandlers[name] = notOnInit ? function(cm, val, old) {
            if (old != Init) handle(cm, val, old);
        } : handle;
    }
    var Init = CodeMirror.Init = {
        toString: function() {
            return "CodeMirror.Init";
        }
    };
    option("value", "", function(cm, val) {
        cm.setValue(val);
    }, true);
    option("mode", null, function(cm, val) {
        cm.doc.modeOption = val;
        loadMode(cm);
    }, true);
    option("indentUnit", 2, loadMode, true);
    option("indentWithTabs", false);
    option("smartIndent", true);
    option("tabSize", 4, function(cm) {
        resetModeState(cm);
        clearCaches(cm);
        regChange(cm);
    }, true);
    option("specialChars", /[\t\u0000-\u0019\u00ad\u200b-\u200f\u2028\u2029\ufeff]/g, function(cm, val) {
        cm.options.specialChars = new RegExp(val.source + (val.test("\t") ? "" : "|\t"), "g");
        cm.refresh();
    }, true);
    option("specialCharPlaceholder", defaultSpecialCharPlaceholder, function(cm) {
        cm.refresh();
    }, true);
    option("electricChars", true);
    option("rtlMoveVisually", !windows);
    option("wholeLineUpdateBefore", true);
    option("theme", "default", function(cm) {
        themeChanged(cm);
        guttersChanged(cm);
    }, true);
    option("keyMap", "default", function(cm, val, old) {
        var next = getKeyMap(val);
        var prev = old != CodeMirror.Init && getKeyMap(old);
        if (prev && prev.detach) prev.detach(cm, next);
        if (next.attach) next.attach(cm, prev || null);
    });
    option("extraKeys", null);
    option("lineWrapping", false, wrappingChanged, true);
    option("gutters", [], function(cm) {
        setGuttersForLineNumbers(cm.options);
        guttersChanged(cm);
    }, true);
    option("fixedGutter", true, function(cm, val) {
        cm.display.gutters.style.left = val ? compensateForHScroll(cm.display) + "px" : "0";
        cm.refresh();
    }, true);
    option("coverGutterNextToScrollbar", false, updateScrollbars, true);
    option("lineNumbers", false, function(cm) {
        setGuttersForLineNumbers(cm.options);
        guttersChanged(cm);
    }, true);
    option("firstLineNumber", 1, guttersChanged, true);
    option("lineNumberFormatter", function(integer) {
        return integer;
    }, guttersChanged, true);
    option("showCursorWhenSelecting", false, updateSelection, true);
    option("resetSelectionOnContextMenu", true);
    option("readOnly", false, function(cm, val) {
        if (val == "nocursor") {
            onBlur(cm);
            cm.display.input.blur();
            cm.display.disabled = true;
        } else {
            cm.display.disabled = false;
            if (!val) resetInput(cm);
        }
    });
    option("disableInput", false, function(cm, val) {
        if (!val) resetInput(cm);
    }, true);
    option("dragDrop", true);
    option("cursorBlinkRate", 530);
    option("cursorScrollMargin", 0);
    option("cursorHeight", 1, updateSelection, true);
    option("singleCursorHeightPerLine", true, updateSelection, true);
    option("workTime", 100);
    option("workDelay", 100);
    option("flattenSpans", true, resetModeState, true);
    option("addModeClass", false, resetModeState, true);
    option("pollInterval", 100);
    option("undoDepth", 200, function(cm, val) {
        cm.doc.history.undoDepth = val;
    });
    option("historyEventDelay", 1250);
    option("viewportMargin", 10, function(cm) {
        cm.refresh();
    }, true);
    option("maxHighlightLength", 1e4, resetModeState, true);
    option("moveInputWithCursor", true, function(cm, val) {
        if (!val) cm.display.inputDiv.style.top = cm.display.inputDiv.style.left = 0;
    });
    option("tabindex", null, function(cm, val) {
        cm.display.input.tabIndex = val || "";
    });
    option("autofocus", null);
    var modes = CodeMirror.modes = {}, mimeModes = CodeMirror.mimeModes = {};
    CodeMirror.defineMode = function(name, mode) {
        if (!CodeMirror.defaults.mode && name != "null") CodeMirror.defaults.mode = name;
        if (arguments.length > 2) mode.dependencies = Array.prototype.slice.call(arguments, 2);
        modes[name] = mode;
    };
    CodeMirror.defineMIME = function(mime, spec) {
        mimeModes[mime] = spec;
    };
    CodeMirror.resolveMode = function(spec) {
        if (typeof spec == "string" && mimeModes.hasOwnProperty(spec)) {
            spec = mimeModes[spec];
        } else if (spec && typeof spec.name == "string" && mimeModes.hasOwnProperty(spec.name)) {
            var found = mimeModes[spec.name];
            if (typeof found == "string") found = {
                name: found
            };
            spec = createObj(found, spec);
            spec.name = found.name;
        } else if (typeof spec == "string" && /^[\w\-]+\/[\w\-]+\+xml$/.test(spec)) {
            return CodeMirror.resolveMode("application/xml");
        }
        if (typeof spec == "string") return {
            name: spec
        }; else return spec || {
            name: "null"
        };
    };
    CodeMirror.getMode = function(options, spec) {
        var spec = CodeMirror.resolveMode(spec);
        var mfactory = modes[spec.name];
        if (!mfactory) return CodeMirror.getMode(options, "text/plain");
        var modeObj = mfactory(options, spec);
        if (modeExtensions.hasOwnProperty(spec.name)) {
            var exts = modeExtensions[spec.name];
            for (var prop in exts) {
                if (!exts.hasOwnProperty(prop)) continue;
                if (modeObj.hasOwnProperty(prop)) modeObj["_" + prop] = modeObj[prop];
                modeObj[prop] = exts[prop];
            }
        }
        modeObj.name = spec.name;
        if (spec.helperType) modeObj.helperType = spec.helperType;
        if (spec.modeProps) for (var prop in spec.modeProps) modeObj[prop] = spec.modeProps[prop];
        return modeObj;
    };
    CodeMirror.defineMode("null", function() {
        return {
            token: function(stream) {
                stream.skipToEnd();
            }
        };
    });
    CodeMirror.defineMIME("text/plain", "null");
    var modeExtensions = CodeMirror.modeExtensions = {};
    CodeMirror.extendMode = function(mode, properties) {
        var exts = modeExtensions.hasOwnProperty(mode) ? modeExtensions[mode] : modeExtensions[mode] = {};
        copyObj(properties, exts);
    };
    CodeMirror.defineExtension = function(name, func) {
        CodeMirror.prototype[name] = func;
    };
    CodeMirror.defineDocExtension = function(name, func) {
        Doc.prototype[name] = func;
    };
    CodeMirror.defineOption = option;
    var initHooks = [];
    CodeMirror.defineInitHook = function(f) {
        initHooks.push(f);
    };
    var helpers = CodeMirror.helpers = {};
    CodeMirror.registerHelper = function(type, name, value) {
        if (!helpers.hasOwnProperty(type)) helpers[type] = CodeMirror[type] = {
            _global: []
        };
        helpers[type][name] = value;
    };
    CodeMirror.registerGlobalHelper = function(type, name, predicate, value) {
        CodeMirror.registerHelper(type, name, value);
        helpers[type]._global.push({
            pred: predicate,
            val: value
        });
    };
    var copyState = CodeMirror.copyState = function(mode, state) {
        if (state === true) return state;
        if (mode.copyState) return mode.copyState(state);
        var nstate = {};
        for (var n in state) {
            var val = state[n];
            if (val instanceof Array) val = val.concat([]);
            nstate[n] = val;
        }
        return nstate;
    };
    var startState = CodeMirror.startState = function(mode, a1, a2) {
        return mode.startState ? mode.startState(a1, a2) : true;
    };
    CodeMirror.innerMode = function(mode, state) {
        while (mode.innerMode) {
            var info = mode.innerMode(state);
            if (!info || info.mode == mode) break;
            state = info.state;
            mode = info.mode;
        }
        return info || {
            mode: mode,
            state: state
        };
    };
    var commands = CodeMirror.commands = {
        selectAll: function(cm) {
            cm.setSelection(Pos(cm.firstLine(), 0), Pos(cm.lastLine()), sel_dontScroll);
        },
        singleSelection: function(cm) {
            cm.setSelection(cm.getCursor("anchor"), cm.getCursor("head"), sel_dontScroll);
        },
        killLine: function(cm) {
            deleteNearSelection(cm, function(range) {
                if (range.empty()) {
                    var len = getLine(cm.doc, range.head.line).text.length;
                    if (range.head.ch == len && range.head.line < cm.lastLine()) return {
                        from: range.head,
                        to: Pos(range.head.line + 1, 0)
                    }; else return {
                        from: range.head,
                        to: Pos(range.head.line, len)
                    };
                } else {
                    return {
                        from: range.from(),
                        to: range.to()
                    };
                }
            });
        },
        deleteLine: function(cm) {
            deleteNearSelection(cm, function(range) {
                return {
                    from: Pos(range.from().line, 0),
                    to: clipPos(cm.doc, Pos(range.to().line + 1, 0))
                };
            });
        },
        delLineLeft: function(cm) {
            deleteNearSelection(cm, function(range) {
                return {
                    from: Pos(range.from().line, 0),
                    to: range.from()
                };
            });
        },
        delWrappedLineLeft: function(cm) {
            deleteNearSelection(cm, function(range) {
                var top = cm.charCoords(range.head, "div").top + 5;
                var leftPos = cm.coordsChar({
                    left: 0,
                    top: top
                }, "div");
                return {
                    from: leftPos,
                    to: range.from()
                };
            });
        },
        delWrappedLineRight: function(cm) {
            deleteNearSelection(cm, function(range) {
                var top = cm.charCoords(range.head, "div").top + 5;
                var rightPos = cm.coordsChar({
                    left: cm.display.lineDiv.offsetWidth + 100,
                    top: top
                }, "div");
                return {
                    from: range.from(),
                    to: rightPos
                };
            });
        },
        undo: function(cm) {
            cm.undo();
        },
        redo: function(cm) {
            cm.redo();
        },
        undoSelection: function(cm) {
            cm.undoSelection();
        },
        redoSelection: function(cm) {
            cm.redoSelection();
        },
        goDocStart: function(cm) {
            cm.extendSelection(Pos(cm.firstLine(), 0));
        },
        goDocEnd: function(cm) {
            cm.extendSelection(Pos(cm.lastLine()));
        },
        goLineStart: function(cm) {
            cm.extendSelectionsBy(function(range) {
                return lineStart(cm, range.head.line);
            }, {
                origin: "+move",
                bias: 1
            });
        },
        goLineStartSmart: function(cm) {
            cm.extendSelectionsBy(function(range) {
                return lineStartSmart(cm, range.head);
            }, {
                origin: "+move",
                bias: 1
            });
        },
        goLineEnd: function(cm) {
            cm.extendSelectionsBy(function(range) {
                return lineEnd(cm, range.head.line);
            }, {
                origin: "+move",
                bias: -1
            });
        },
        goLineRight: function(cm) {
            cm.extendSelectionsBy(function(range) {
                var top = cm.charCoords(range.head, "div").top + 5;
                return cm.coordsChar({
                    left: cm.display.lineDiv.offsetWidth + 100,
                    top: top
                }, "div");
            }, sel_move);
        },
        goLineLeft: function(cm) {
            cm.extendSelectionsBy(function(range) {
                var top = cm.charCoords(range.head, "div").top + 5;
                return cm.coordsChar({
                    left: 0,
                    top: top
                }, "div");
            }, sel_move);
        },
        goLineLeftSmart: function(cm) {
            cm.extendSelectionsBy(function(range) {
                var top = cm.charCoords(range.head, "div").top + 5;
                var pos = cm.coordsChar({
                    left: 0,
                    top: top
                }, "div");
                if (pos.ch < cm.getLine(pos.line).search(/\S/)) return lineStartSmart(cm, range.head);
                return pos;
            }, sel_move);
        },
        goLineUp: function(cm) {
            cm.moveV(-1, "line");
        },
        goLineDown: function(cm) {
            cm.moveV(1, "line");
        },
        goPageUp: function(cm) {
            cm.moveV(-1, "page");
        },
        goPageDown: function(cm) {
            cm.moveV(1, "page");
        },
        goCharLeft: function(cm) {
            cm.moveH(-1, "char");
        },
        goCharRight: function(cm) {
            cm.moveH(1, "char");
        },
        goColumnLeft: function(cm) {
            cm.moveH(-1, "column");
        },
        goColumnRight: function(cm) {
            cm.moveH(1, "column");
        },
        goWordLeft: function(cm) {
            cm.moveH(-1, "word");
        },
        goGroupRight: function(cm) {
            cm.moveH(1, "group");
        },
        goGroupLeft: function(cm) {
            cm.moveH(-1, "group");
        },
        goWordRight: function(cm) {
            cm.moveH(1, "word");
        },
        delCharBefore: function(cm) {
            cm.deleteH(-1, "char");
        },
        delCharAfter: function(cm) {
            cm.deleteH(1, "char");
        },
        delWordBefore: function(cm) {
            cm.deleteH(-1, "word");
        },
        delWordAfter: function(cm) {
            cm.deleteH(1, "word");
        },
        delGroupBefore: function(cm) {
            cm.deleteH(-1, "group");
        },
        delGroupAfter: function(cm) {
            cm.deleteH(1, "group");
        },
        indentAuto: function(cm) {
            cm.indentSelection("smart");
        },
        indentMore: function(cm) {
            cm.indentSelection("add");
        },
        indentLess: function(cm) {
            cm.indentSelection("subtract");
        },
        insertTab: function(cm) {
            cm.replaceSelection("\t");
        },
        insertSoftTab: function(cm) {
            var spaces = [], ranges = cm.listSelections(), tabSize = cm.options.tabSize;
            for (var i = 0; i < ranges.length; i++) {
                var pos = ranges[i].from();
                var col = countColumn(cm.getLine(pos.line), pos.ch, tabSize);
                spaces.push(new Array(tabSize - col % tabSize + 1).join(" "));
            }
            cm.replaceSelections(spaces);
        },
        defaultTab: function(cm) {
            if (cm.somethingSelected()) cm.indentSelection("add"); else cm.execCommand("insertTab");
        },
        transposeChars: function(cm) {
            runInOp(cm, function() {
                var ranges = cm.listSelections(), newSel = [];
                for (var i = 0; i < ranges.length; i++) {
                    var cur = ranges[i].head, line = getLine(cm.doc, cur.line).text;
                    if (line) {
                        if (cur.ch == line.length) cur = new Pos(cur.line, cur.ch - 1);
                        if (cur.ch > 0) {
                            cur = new Pos(cur.line, cur.ch + 1);
                            cm.replaceRange(line.charAt(cur.ch - 1) + line.charAt(cur.ch - 2), Pos(cur.line, cur.ch - 2), cur, "+transpose");
                        } else if (cur.line > cm.doc.first) {
                            var prev = getLine(cm.doc, cur.line - 1).text;
                            if (prev) cm.replaceRange(line.charAt(0) + "\n" + prev.charAt(prev.length - 1), Pos(cur.line - 1, prev.length - 1), Pos(cur.line, 1), "+transpose");
                        }
                    }
                    newSel.push(new Range(cur, cur));
                }
                cm.setSelections(newSel);
            });
        },
        newlineAndIndent: function(cm) {
            runInOp(cm, function() {
                var len = cm.listSelections().length;
                for (var i = 0; i < len; i++) {
                    var range = cm.listSelections()[i];
                    cm.replaceRange("\n", range.anchor, range.head, "+input");
                    cm.indentLine(range.from().line + 1, null, true);
                    ensureCursorVisible(cm);
                }
            });
        },
        toggleOverwrite: function(cm) {
            cm.toggleOverwrite();
        }
    };
    var keyMap = CodeMirror.keyMap = {};
    keyMap.basic = {
        Left: "goCharLeft",
        Right: "goCharRight",
        Up: "goLineUp",
        Down: "goLineDown",
        End: "goLineEnd",
        Home: "goLineStartSmart",
        PageUp: "goPageUp",
        PageDown: "goPageDown",
        Delete: "delCharAfter",
        Backspace: "delCharBefore",
        "Shift-Backspace": "delCharBefore",
        Tab: "defaultTab",
        "Shift-Tab": "indentAuto",
        Enter: "newlineAndIndent",
        Insert: "toggleOverwrite",
        Esc: "singleSelection"
    };
    keyMap.pcDefault = {
        "Ctrl-A": "selectAll",
        "Ctrl-D": "deleteLine",
        "Ctrl-Z": "undo",
        "Shift-Ctrl-Z": "redo",
        "Ctrl-Y": "redo",
        "Ctrl-Home": "goDocStart",
        "Ctrl-End": "goDocEnd",
        "Ctrl-Up": "goLineUp",
        "Ctrl-Down": "goLineDown",
        "Ctrl-Left": "goGroupLeft",
        "Ctrl-Right": "goGroupRight",
        "Alt-Left": "goLineStart",
        "Alt-Right": "goLineEnd",
        "Ctrl-Backspace": "delGroupBefore",
        "Ctrl-Delete": "delGroupAfter",
        "Ctrl-S": "save",
        "Ctrl-F": "find",
        "Ctrl-G": "findNext",
        "Shift-Ctrl-G": "findPrev",
        "Shift-Ctrl-F": "replace",
        "Shift-Ctrl-R": "replaceAll",
        "Ctrl-[": "indentLess",
        "Ctrl-]": "indentMore",
        "Ctrl-U": "undoSelection",
        "Shift-Ctrl-U": "redoSelection",
        "Alt-U": "redoSelection",
        fallthrough: "basic"
    };
    keyMap.emacsy = {
        "Ctrl-F": "goCharRight",
        "Ctrl-B": "goCharLeft",
        "Ctrl-P": "goLineUp",
        "Ctrl-N": "goLineDown",
        "Alt-F": "goWordRight",
        "Alt-B": "goWordLeft",
        "Ctrl-A": "goLineStart",
        "Ctrl-E": "goLineEnd",
        "Ctrl-V": "goPageDown",
        "Shift-Ctrl-V": "goPageUp",
        "Ctrl-D": "delCharAfter",
        "Ctrl-H": "delCharBefore",
        "Alt-D": "delWordAfter",
        "Alt-Backspace": "delWordBefore",
        "Ctrl-K": "killLine",
        "Ctrl-T": "transposeChars"
    };
    keyMap.macDefault = {
        "Cmd-A": "selectAll",
        "Cmd-D": "deleteLine",
        "Cmd-Z": "undo",
        "Shift-Cmd-Z": "redo",
        "Cmd-Y": "redo",
        "Cmd-Home": "goDocStart",
        "Cmd-Up": "goDocStart",
        "Cmd-End": "goDocEnd",
        "Cmd-Down": "goDocEnd",
        "Alt-Left": "goGroupLeft",
        "Alt-Right": "goGroupRight",
        "Cmd-Left": "goLineLeft",
        "Cmd-Right": "goLineRight",
        "Alt-Backspace": "delGroupBefore",
        "Ctrl-Alt-Backspace": "delGroupAfter",
        "Alt-Delete": "delGroupAfter",
        "Cmd-S": "save",
        "Cmd-F": "find",
        "Cmd-G": "findNext",
        "Shift-Cmd-G": "findPrev",
        "Cmd-Alt-F": "replace",
        "Shift-Cmd-Alt-F": "replaceAll",
        "Cmd-[": "indentLess",
        "Cmd-]": "indentMore",
        "Cmd-Backspace": "delWrappedLineLeft",
        "Cmd-Delete": "delWrappedLineRight",
        "Cmd-U": "undoSelection",
        "Shift-Cmd-U": "redoSelection",
        "Ctrl-Up": "goDocStart",
        "Ctrl-Down": "goDocEnd",
        fallthrough: [ "basic", "emacsy" ]
    };
    keyMap["default"] = mac ? keyMap.macDefault : keyMap.pcDefault;
    function normalizeKeyName(name) {
        var parts = name.split(/-(?!$)/), name = parts[parts.length - 1];
        var alt, ctrl, shift, cmd;
        for (var i = 0; i < parts.length - 1; i++) {
            var mod = parts[i];
            if (/^(cmd|meta|m)$/i.test(mod)) cmd = true; else if (/^a(lt)?$/i.test(mod)) alt = true; else if (/^(c|ctrl|control)$/i.test(mod)) ctrl = true; else if (/^s(hift)$/i.test(mod)) shift = true; else throw new Error("Unrecognized modifier name: " + mod);
        }
        if (alt) name = "Alt-" + name;
        if (ctrl) name = "Ctrl-" + name;
        if (cmd) name = "Cmd-" + name;
        if (shift) name = "Shift-" + name;
        return name;
    }
    CodeMirror.normalizeKeyMap = function(keymap) {
        var copy = {};
        for (var keyname in keymap) if (keymap.hasOwnProperty(keyname)) {
            var value = keymap[keyname];
            if (/^(name|fallthrough|(de|at)tach)$/.test(keyname)) continue;
            if (value == "...") {
                delete keymap[keyname];
                continue;
            }
            var keys = map(keyname.split(" "), normalizeKeyName);
            for (var i = 0; i < keys.length; i++) {
                var val, name;
                if (i == keys.length - 1) {
                    name = keyname;
                    val = value;
                } else {
                    name = keys.slice(0, i + 1).join(" ");
                    val = "...";
                }
                var prev = copy[name];
                if (!prev) copy[name] = val; else if (prev != val) throw new Error("Inconsistent bindings for " + name);
            }
            delete keymap[keyname];
        }
        for (var prop in copy) keymap[prop] = copy[prop];
        return keymap;
    };
    var lookupKey = CodeMirror.lookupKey = function(key, map, handle) {
        map = getKeyMap(map);
        var found = map.call ? map.call(key) : map[key];
        if (found === false) return "nothing";
        if (found === "...") return "multi";
        if (found != null && handle(found)) return "handled";
        if (map.fallthrough) {
            if (Object.prototype.toString.call(map.fallthrough) != "[object Array]") return lookupKey(key, map.fallthrough, handle);
            for (var i = 0; i < map.fallthrough.length; i++) {
                var result = lookupKey(key, map.fallthrough[i], handle);
                if (result) return result;
            }
        }
    };
    var isModifierKey = CodeMirror.isModifierKey = function(value) {
        var name = typeof value == "string" ? value : keyNames[value.keyCode];
        return name == "Ctrl" || name == "Alt" || name == "Shift" || name == "Mod";
    };
    var keyName = CodeMirror.keyName = function(event, noShift) {
        if (presto && event.keyCode == 34 && event["char"]) return false;
        var base = keyNames[event.keyCode], name = base;
        if (name == null || event.altGraphKey) return false;
        if (event.altKey && base != "Alt") name = "Alt-" + name;
        if ((flipCtrlCmd ? event.metaKey : event.ctrlKey) && base != "Ctrl") name = "Ctrl-" + name;
        if ((flipCtrlCmd ? event.ctrlKey : event.metaKey) && base != "Cmd") name = "Cmd-" + name;
        if (!noShift && event.shiftKey && base != "Shift") name = "Shift-" + name;
        return name;
    };
    function getKeyMap(val) {
        return typeof val == "string" ? keyMap[val] : val;
    }
    CodeMirror.fromTextArea = function(textarea, options) {
        if (!options) options = {};
        options.value = textarea.value;
        if (!options.tabindex && textarea.tabindex) options.tabindex = textarea.tabindex;
        if (!options.placeholder && textarea.placeholder) options.placeholder = textarea.placeholder;
        if (options.autofocus == null) {
            var hasFocus = activeElt();
            options.autofocus = hasFocus == textarea || textarea.getAttribute("autofocus") != null && hasFocus == document.body;
        }
        function save() {
            textarea.value = cm.getValue();
        }
        if (textarea.form) {
            on(textarea.form, "submit", save);
            if (!options.leaveSubmitMethodAlone) {
                var form = textarea.form, realSubmit = form.submit;
                try {
                    var wrappedSubmit = form.submit = function() {
                        save();
                        form.submit = realSubmit;
                        form.submit();
                        form.submit = wrappedSubmit;
                    };
                } catch (e) {}
            }
        }
        textarea.style.display = "none";
        var cm = CodeMirror(function(node) {
            textarea.parentNode.insertBefore(node, textarea.nextSibling);
        }, options);
        cm.save = save;
        cm.getTextArea = function() {
            return textarea;
        };
        cm.toTextArea = function() {
            cm.toTextArea = isNaN;
            save();
            textarea.parentNode.removeChild(cm.getWrapperElement());
            textarea.style.display = "";
            if (textarea.form) {
                off(textarea.form, "submit", save);
                if (typeof textarea.form.submit == "function") textarea.form.submit = realSubmit;
            }
        };
        return cm;
    };
    var StringStream = CodeMirror.StringStream = function(string, tabSize) {
        this.pos = this.start = 0;
        this.string = string;
        this.tabSize = tabSize || 8;
        this.lastColumnPos = this.lastColumnValue = 0;
        this.lineStart = 0;
    };
    StringStream.prototype = {
        eol: function() {
            return this.pos >= this.string.length;
        },
        sol: function() {
            return this.pos == this.lineStart;
        },
        peek: function() {
            return this.string.charAt(this.pos) || undefined;
        },
        next: function() {
            if (this.pos < this.string.length) return this.string.charAt(this.pos++);
        },
        eat: function(match) {
            var ch = this.string.charAt(this.pos);
            if (typeof match == "string") var ok = ch == match; else var ok = ch && (match.test ? match.test(ch) : match(ch));
            if (ok) {
                ++this.pos;
                return ch;
            }
        },
        eatWhile: function(match) {
            var start = this.pos;
            while (this.eat(match)) {}
            return this.pos > start;
        },
        eatSpace: function() {
            var start = this.pos;
            while (/[\s\u00a0]/.test(this.string.charAt(this.pos))) ++this.pos;
            return this.pos > start;
        },
        skipToEnd: function() {
            this.pos = this.string.length;
        },
        skipTo: function(ch) {
            var found = this.string.indexOf(ch, this.pos);
            if (found > -1) {
                this.pos = found;
                return true;
            }
        },
        backUp: function(n) {
            this.pos -= n;
        },
        column: function() {
            if (this.lastColumnPos < this.start) {
                this.lastColumnValue = countColumn(this.string, this.start, this.tabSize, this.lastColumnPos, this.lastColumnValue);
                this.lastColumnPos = this.start;
            }
            return this.lastColumnValue - (this.lineStart ? countColumn(this.string, this.lineStart, this.tabSize) : 0);
        },
        indentation: function() {
            return countColumn(this.string, null, this.tabSize) - (this.lineStart ? countColumn(this.string, this.lineStart, this.tabSize) : 0);
        },
        match: function(pattern, consume, caseInsensitive) {
            if (typeof pattern == "string") {
                var cased = function(str) {
                    return caseInsensitive ? str.toLowerCase() : str;
                };
                var substr = this.string.substr(this.pos, pattern.length);
                if (cased(substr) == cased(pattern)) {
                    if (consume !== false) this.pos += pattern.length;
                    return true;
                }
            } else {
                var match = this.string.slice(this.pos).match(pattern);
                if (match && match.index > 0) return null;
                if (match && consume !== false) this.pos += match[0].length;
                return match;
            }
        },
        current: function() {
            return this.string.slice(this.start, this.pos);
        },
        hideFirstChars: function(n, inner) {
            this.lineStart += n;
            try {
                return inner();
            } finally {
                this.lineStart -= n;
            }
        }
    };
    var TextMarker = CodeMirror.TextMarker = function(doc, type) {
        this.lines = [];
        this.type = type;
        this.doc = doc;
    };
    eventMixin(TextMarker);
    TextMarker.prototype.clear = function() {
        if (this.explicitlyCleared) return;
        var cm = this.doc.cm, withOp = cm && !cm.curOp;
        if (withOp) startOperation(cm);
        if (hasHandler(this, "clear")) {
            var found = this.find();
            if (found) signalLater(this, "clear", found.from, found.to);
        }
        var min = null, max = null;
        for (var i = 0; i < this.lines.length; ++i) {
            var line = this.lines[i];
            var span = getMarkedSpanFor(line.markedSpans, this);
            if (cm && !this.collapsed) regLineChange(cm, lineNo(line), "text"); else if (cm) {
                if (span.to != null) max = lineNo(line);
                if (span.from != null) min = lineNo(line);
            }
            line.markedSpans = removeMarkedSpan(line.markedSpans, span);
            if (span.from == null && this.collapsed && !lineIsHidden(this.doc, line) && cm) updateLineHeight(line, textHeight(cm.display));
        }
        if (cm && this.collapsed && !cm.options.lineWrapping) for (var i = 0; i < this.lines.length; ++i) {
            var visual = visualLine(this.lines[i]), len = lineLength(visual);
            if (len > cm.display.maxLineLength) {
                cm.display.maxLine = visual;
                cm.display.maxLineLength = len;
                cm.display.maxLineChanged = true;
            }
        }
        if (min != null && cm && this.collapsed) regChange(cm, min, max + 1);
        this.lines.length = 0;
        this.explicitlyCleared = true;
        if (this.atomic && this.doc.cantEdit) {
            this.doc.cantEdit = false;
            if (cm) reCheckSelection(cm.doc);
        }
        if (cm) signalLater(cm, "markerCleared", cm, this);
        if (withOp) endOperation(cm);
        if (this.parent) this.parent.clear();
    };
    TextMarker.prototype.find = function(side, lineObj) {
        if (side == null && this.type == "bookmark") side = 1;
        var from, to;
        for (var i = 0; i < this.lines.length; ++i) {
            var line = this.lines[i];
            var span = getMarkedSpanFor(line.markedSpans, this);
            if (span.from != null) {
                from = Pos(lineObj ? line : lineNo(line), span.from);
                if (side == -1) return from;
            }
            if (span.to != null) {
                to = Pos(lineObj ? line : lineNo(line), span.to);
                if (side == 1) return to;
            }
        }
        return from && {
            from: from,
            to: to
        };
    };
    TextMarker.prototype.changed = function() {
        var pos = this.find(-1, true), widget = this, cm = this.doc.cm;
        if (!pos || !cm) return;
        runInOp(cm, function() {
            var line = pos.line, lineN = lineNo(pos.line);
            var view = findViewForLine(cm, lineN);
            if (view) {
                clearLineMeasurementCacheFor(view);
                cm.curOp.selectionChanged = cm.curOp.forceUpdate = true;
            }
            cm.curOp.updateMaxLine = true;
            if (!lineIsHidden(widget.doc, line) && widget.height != null) {
                var oldHeight = widget.height;
                widget.height = null;
                var dHeight = widgetHeight(widget) - oldHeight;
                if (dHeight) updateLineHeight(line, line.height + dHeight);
            }
        });
    };
    TextMarker.prototype.attachLine = function(line) {
        if (!this.lines.length && this.doc.cm) {
            var op = this.doc.cm.curOp;
            if (!op.maybeHiddenMarkers || indexOf(op.maybeHiddenMarkers, this) == -1) (op.maybeUnhiddenMarkers || (op.maybeUnhiddenMarkers = [])).push(this);
        }
        this.lines.push(line);
    };
    TextMarker.prototype.detachLine = function(line) {
        this.lines.splice(indexOf(this.lines, line), 1);
        if (!this.lines.length && this.doc.cm) {
            var op = this.doc.cm.curOp;
            (op.maybeHiddenMarkers || (op.maybeHiddenMarkers = [])).push(this);
        }
    };
    var nextMarkerId = 0;
    function markText(doc, from, to, options, type) {
        if (options && options.shared) return markTextShared(doc, from, to, options, type);
        if (doc.cm && !doc.cm.curOp) return operation(doc.cm, markText)(doc, from, to, options, type);
        var marker = new TextMarker(doc, type), diff = cmp(from, to);
        if (options) copyObj(options, marker, false);
        if (diff > 0 || diff == 0 && marker.clearWhenEmpty !== false) return marker;
        if (marker.replacedWith) {
            marker.collapsed = true;
            marker.widgetNode = elt("span", [ marker.replacedWith ], "CodeMirror-widget");
            if (!options.handleMouseEvents) marker.widgetNode.ignoreEvents = true;
            if (options.insertLeft) marker.widgetNode.insertLeft = true;
        }
        if (marker.collapsed) {
            if (conflictingCollapsedRange(doc, from.line, from, to, marker) || from.line != to.line && conflictingCollapsedRange(doc, to.line, from, to, marker)) throw new Error("Inserting collapsed marker partially overlapping an existing one");
            sawCollapsedSpans = true;
        }
        if (marker.addToHistory) addChangeToHistory(doc, {
            from: from,
            to: to,
            origin: "markText"
        }, doc.sel, NaN);
        var curLine = from.line, cm = doc.cm, updateMaxLine;
        doc.iter(curLine, to.line + 1, function(line) {
            if (cm && marker.collapsed && !cm.options.lineWrapping && visualLine(line) == cm.display.maxLine) updateMaxLine = true;
            if (marker.collapsed && curLine != from.line) updateLineHeight(line, 0);
            addMarkedSpan(line, new MarkedSpan(marker, curLine == from.line ? from.ch : null, curLine == to.line ? to.ch : null));
            ++curLine;
        });
        if (marker.collapsed) doc.iter(from.line, to.line + 1, function(line) {
            if (lineIsHidden(doc, line)) updateLineHeight(line, 0);
        });
        if (marker.clearOnEnter) on(marker, "beforeCursorEnter", function() {
            marker.clear();
        });
        if (marker.readOnly) {
            sawReadOnlySpans = true;
            if (doc.history.done.length || doc.history.undone.length) doc.clearHistory();
        }
        if (marker.collapsed) {
            marker.id = ++nextMarkerId;
            marker.atomic = true;
        }
        if (cm) {
            if (updateMaxLine) cm.curOp.updateMaxLine = true;
            if (marker.collapsed) regChange(cm, from.line, to.line + 1); else if (marker.className || marker.title || marker.startStyle || marker.endStyle) for (var i = from.line; i <= to.line; i++) regLineChange(cm, i, "text");
            if (marker.atomic) reCheckSelection(cm.doc);
            signalLater(cm, "markerAdded", cm, marker);
        }
        return marker;
    }
    var SharedTextMarker = CodeMirror.SharedTextMarker = function(markers, primary) {
        this.markers = markers;
        this.primary = primary;
        for (var i = 0; i < markers.length; ++i) markers[i].parent = this;
    };
    eventMixin(SharedTextMarker);
    SharedTextMarker.prototype.clear = function() {
        if (this.explicitlyCleared) return;
        this.explicitlyCleared = true;
        for (var i = 0; i < this.markers.length; ++i) this.markers[i].clear();
        signalLater(this, "clear");
    };
    SharedTextMarker.prototype.find = function(side, lineObj) {
        return this.primary.find(side, lineObj);
    };
    function markTextShared(doc, from, to, options, type) {
        options = copyObj(options);
        options.shared = false;
        var markers = [ markText(doc, from, to, options, type) ], primary = markers[0];
        var widget = options.widgetNode;
        linkedDocs(doc, function(doc) {
            if (widget) options.widgetNode = widget.cloneNode(true);
            markers.push(markText(doc, clipPos(doc, from), clipPos(doc, to), options, type));
            for (var i = 0; i < doc.linked.length; ++i) if (doc.linked[i].isParent) return;
            primary = lst(markers);
        });
        return new SharedTextMarker(markers, primary);
    }
    function findSharedMarkers(doc) {
        return doc.findMarks(Pos(doc.first, 0), doc.clipPos(Pos(doc.lastLine())), function(m) {
            return m.parent;
        });
    }
    function copySharedMarkers(doc, markers) {
        for (var i = 0; i < markers.length; i++) {
            var marker = markers[i], pos = marker.find();
            var mFrom = doc.clipPos(pos.from), mTo = doc.clipPos(pos.to);
            if (cmp(mFrom, mTo)) {
                var subMark = markText(doc, mFrom, mTo, marker.primary, marker.primary.type);
                marker.markers.push(subMark);
                subMark.parent = marker;
            }
        }
    }
    function detachSharedMarkers(markers) {
        for (var i = 0; i < markers.length; i++) {
            var marker = markers[i], linked = [ marker.primary.doc ];
            linkedDocs(marker.primary.doc, function(d) {
                linked.push(d);
            });
            for (var j = 0; j < marker.markers.length; j++) {
                var subMarker = marker.markers[j];
                if (indexOf(linked, subMarker.doc) == -1) {
                    subMarker.parent = null;
                    marker.markers.splice(j--, 1);
                }
            }
        }
    }
    function MarkedSpan(marker, from, to) {
        this.marker = marker;
        this.from = from;
        this.to = to;
    }
    function getMarkedSpanFor(spans, marker) {
        if (spans) for (var i = 0; i < spans.length; ++i) {
            var span = spans[i];
            if (span.marker == marker) return span;
        }
    }
    function removeMarkedSpan(spans, span) {
        for (var r, i = 0; i < spans.length; ++i) if (spans[i] != span) (r || (r = [])).push(spans[i]);
        return r;
    }
    function addMarkedSpan(line, span) {
        line.markedSpans = line.markedSpans ? line.markedSpans.concat([ span ]) : [ span ];
        span.marker.attachLine(line);
    }
    function markedSpansBefore(old, startCh, isInsert) {
        if (old) for (var i = 0, nw; i < old.length; ++i) {
            var span = old[i], marker = span.marker;
            var startsBefore = span.from == null || (marker.inclusiveLeft ? span.from <= startCh : span.from < startCh);
            if (startsBefore || span.from == startCh && marker.type == "bookmark" && (!isInsert || !span.marker.insertLeft)) {
                var endsAfter = span.to == null || (marker.inclusiveRight ? span.to >= startCh : span.to > startCh);
                (nw || (nw = [])).push(new MarkedSpan(marker, span.from, endsAfter ? null : span.to));
            }
        }
        return nw;
    }
    function markedSpansAfter(old, endCh, isInsert) {
        if (old) for (var i = 0, nw; i < old.length; ++i) {
            var span = old[i], marker = span.marker;
            var endsAfter = span.to == null || (marker.inclusiveRight ? span.to >= endCh : span.to > endCh);
            if (endsAfter || span.from == endCh && marker.type == "bookmark" && (!isInsert || span.marker.insertLeft)) {
                var startsBefore = span.from == null || (marker.inclusiveLeft ? span.from <= endCh : span.from < endCh);
                (nw || (nw = [])).push(new MarkedSpan(marker, startsBefore ? null : span.from - endCh, span.to == null ? null : span.to - endCh));
            }
        }
        return nw;
    }
    function stretchSpansOverChange(doc, change) {
        var oldFirst = isLine(doc, change.from.line) && getLine(doc, change.from.line).markedSpans;
        var oldLast = isLine(doc, change.to.line) && getLine(doc, change.to.line).markedSpans;
        if (!oldFirst && !oldLast) return null;
        var startCh = change.from.ch, endCh = change.to.ch, isInsert = cmp(change.from, change.to) == 0;
        var first = markedSpansBefore(oldFirst, startCh, isInsert);
        var last = markedSpansAfter(oldLast, endCh, isInsert);
        var sameLine = change.text.length == 1, offset = lst(change.text).length + (sameLine ? startCh : 0);
        if (first) {
            for (var i = 0; i < first.length; ++i) {
                var span = first[i];
                if (span.to == null) {
                    var found = getMarkedSpanFor(last, span.marker);
                    if (!found) span.to = startCh; else if (sameLine) span.to = found.to == null ? null : found.to + offset;
                }
            }
        }
        if (last) {
            for (var i = 0; i < last.length; ++i) {
                var span = last[i];
                if (span.to != null) span.to += offset;
                if (span.from == null) {
                    var found = getMarkedSpanFor(first, span.marker);
                    if (!found) {
                        span.from = offset;
                        if (sameLine) (first || (first = [])).push(span);
                    }
                } else {
                    span.from += offset;
                    if (sameLine) (first || (first = [])).push(span);
                }
            }
        }
        if (first) first = clearEmptySpans(first);
        if (last && last != first) last = clearEmptySpans(last);
        var newMarkers = [ first ];
        if (!sameLine) {
            var gap = change.text.length - 2, gapMarkers;
            if (gap > 0 && first) for (var i = 0; i < first.length; ++i) if (first[i].to == null) (gapMarkers || (gapMarkers = [])).push(new MarkedSpan(first[i].marker, null, null));
            for (var i = 0; i < gap; ++i) newMarkers.push(gapMarkers);
            newMarkers.push(last);
        }
        return newMarkers;
    }
    function clearEmptySpans(spans) {
        for (var i = 0; i < spans.length; ++i) {
            var span = spans[i];
            if (span.from != null && span.from == span.to && span.marker.clearWhenEmpty !== false) spans.splice(i--, 1);
        }
        if (!spans.length) return null;
        return spans;
    }
    function mergeOldSpans(doc, change) {
        var old = getOldSpans(doc, change);
        var stretched = stretchSpansOverChange(doc, change);
        if (!old) return stretched;
        if (!stretched) return old;
        for (var i = 0; i < old.length; ++i) {
            var oldCur = old[i], stretchCur = stretched[i];
            if (oldCur && stretchCur) {
                spans: for (var j = 0; j < stretchCur.length; ++j) {
                    var span = stretchCur[j];
                    for (var k = 0; k < oldCur.length; ++k) if (oldCur[k].marker == span.marker) continue spans;
                    oldCur.push(span);
                }
            } else if (stretchCur) {
                old[i] = stretchCur;
            }
        }
        return old;
    }
    function removeReadOnlyRanges(doc, from, to) {
        var markers = null;
        doc.iter(from.line, to.line + 1, function(line) {
            if (line.markedSpans) for (var i = 0; i < line.markedSpans.length; ++i) {
                var mark = line.markedSpans[i].marker;
                if (mark.readOnly && (!markers || indexOf(markers, mark) == -1)) (markers || (markers = [])).push(mark);
            }
        });
        if (!markers) return null;
        var parts = [ {
            from: from,
            to: to
        } ];
        for (var i = 0; i < markers.length; ++i) {
            var mk = markers[i], m = mk.find(0);
            for (var j = 0; j < parts.length; ++j) {
                var p = parts[j];
                if (cmp(p.to, m.from) < 0 || cmp(p.from, m.to) > 0) continue;
                var newParts = [ j, 1 ], dfrom = cmp(p.from, m.from), dto = cmp(p.to, m.to);
                if (dfrom < 0 || !mk.inclusiveLeft && !dfrom) newParts.push({
                    from: p.from,
                    to: m.from
                });
                if (dto > 0 || !mk.inclusiveRight && !dto) newParts.push({
                    from: m.to,
                    to: p.to
                });
                parts.splice.apply(parts, newParts);
                j += newParts.length - 1;
            }
        }
        return parts;
    }
    function detachMarkedSpans(line) {
        var spans = line.markedSpans;
        if (!spans) return;
        for (var i = 0; i < spans.length; ++i) spans[i].marker.detachLine(line);
        line.markedSpans = null;
    }
    function attachMarkedSpans(line, spans) {
        if (!spans) return;
        for (var i = 0; i < spans.length; ++i) spans[i].marker.attachLine(line);
        line.markedSpans = spans;
    }
    function extraLeft(marker) {
        return marker.inclusiveLeft ? -1 : 0;
    }
    function extraRight(marker) {
        return marker.inclusiveRight ? 1 : 0;
    }
    function compareCollapsedMarkers(a, b) {
        var lenDiff = a.lines.length - b.lines.length;
        if (lenDiff != 0) return lenDiff;
        var aPos = a.find(), bPos = b.find();
        var fromCmp = cmp(aPos.from, bPos.from) || extraLeft(a) - extraLeft(b);
        if (fromCmp) return -fromCmp;
        var toCmp = cmp(aPos.to, bPos.to) || extraRight(a) - extraRight(b);
        if (toCmp) return toCmp;
        return b.id - a.id;
    }
    function collapsedSpanAtSide(line, start) {
        var sps = sawCollapsedSpans && line.markedSpans, found;
        if (sps) for (var sp, i = 0; i < sps.length; ++i) {
            sp = sps[i];
            if (sp.marker.collapsed && (start ? sp.from : sp.to) == null && (!found || compareCollapsedMarkers(found, sp.marker) < 0)) found = sp.marker;
        }
        return found;
    }
    function collapsedSpanAtStart(line) {
        return collapsedSpanAtSide(line, true);
    }
    function collapsedSpanAtEnd(line) {
        return collapsedSpanAtSide(line, false);
    }
    function conflictingCollapsedRange(doc, lineNo, from, to, marker) {
        var line = getLine(doc, lineNo);
        var sps = sawCollapsedSpans && line.markedSpans;
        if (sps) for (var i = 0; i < sps.length; ++i) {
            var sp = sps[i];
            if (!sp.marker.collapsed) continue;
            var found = sp.marker.find(0);
            var fromCmp = cmp(found.from, from) || extraLeft(sp.marker) - extraLeft(marker);
            var toCmp = cmp(found.to, to) || extraRight(sp.marker) - extraRight(marker);
            if (fromCmp >= 0 && toCmp <= 0 || fromCmp <= 0 && toCmp >= 0) continue;
            if (fromCmp <= 0 && (cmp(found.to, from) > 0 || sp.marker.inclusiveRight && marker.inclusiveLeft) || fromCmp >= 0 && (cmp(found.from, to) < 0 || sp.marker.inclusiveLeft && marker.inclusiveRight)) return true;
        }
    }
    function visualLine(line) {
        var merged;
        while (merged = collapsedSpanAtStart(line)) line = merged.find(-1, true).line;
        return line;
    }
    function visualLineContinued(line) {
        var merged, lines;
        while (merged = collapsedSpanAtEnd(line)) {
            line = merged.find(1, true).line;
            (lines || (lines = [])).push(line);
        }
        return lines;
    }
    function visualLineNo(doc, lineN) {
        var line = getLine(doc, lineN), vis = visualLine(line);
        if (line == vis) return lineN;
        return lineNo(vis);
    }
    function visualLineEndNo(doc, lineN) {
        if (lineN > doc.lastLine()) return lineN;
        var line = getLine(doc, lineN), merged;
        if (!lineIsHidden(doc, line)) return lineN;
        while (merged = collapsedSpanAtEnd(line)) line = merged.find(1, true).line;
        return lineNo(line) + 1;
    }
    function lineIsHidden(doc, line) {
        var sps = sawCollapsedSpans && line.markedSpans;
        if (sps) for (var sp, i = 0; i < sps.length; ++i) {
            sp = sps[i];
            if (!sp.marker.collapsed) continue;
            if (sp.from == null) return true;
            if (sp.marker.widgetNode) continue;
            if (sp.from == 0 && sp.marker.inclusiveLeft && lineIsHiddenInner(doc, line, sp)) return true;
        }
    }
    function lineIsHiddenInner(doc, line, span) {
        if (span.to == null) {
            var end = span.marker.find(1, true);
            return lineIsHiddenInner(doc, end.line, getMarkedSpanFor(end.line.markedSpans, span.marker));
        }
        if (span.marker.inclusiveRight && span.to == line.text.length) return true;
        for (var sp, i = 0; i < line.markedSpans.length; ++i) {
            sp = line.markedSpans[i];
            if (sp.marker.collapsed && !sp.marker.widgetNode && sp.from == span.to && (sp.to == null || sp.to != span.from) && (sp.marker.inclusiveLeft || span.marker.inclusiveRight) && lineIsHiddenInner(doc, line, sp)) return true;
        }
    }
    var LineWidget = CodeMirror.LineWidget = function(cm, node, options) {
        if (options) for (var opt in options) if (options.hasOwnProperty(opt)) this[opt] = options[opt];
        this.cm = cm;
        this.node = node;
    };
    eventMixin(LineWidget);
    function adjustScrollWhenAboveVisible(cm, line, diff) {
        if (heightAtLine(line) < (cm.curOp && cm.curOp.scrollTop || cm.doc.scrollTop)) addToScrollPos(cm, null, diff);
    }
    LineWidget.prototype.clear = function() {
        var cm = this.cm, ws = this.line.widgets, line = this.line, no = lineNo(line);
        if (no == null || !ws) return;
        for (var i = 0; i < ws.length; ++i) if (ws[i] == this) ws.splice(i--, 1);
        if (!ws.length) line.widgets = null;
        var height = widgetHeight(this);
        runInOp(cm, function() {
            adjustScrollWhenAboveVisible(cm, line, -height);
            regLineChange(cm, no, "widget");
            updateLineHeight(line, Math.max(0, line.height - height));
        });
    };
    LineWidget.prototype.changed = function() {
        var oldH = this.height, cm = this.cm, line = this.line;
        this.height = null;
        var diff = widgetHeight(this) - oldH;
        if (!diff) return;
        runInOp(cm, function() {
            cm.curOp.forceUpdate = true;
            adjustScrollWhenAboveVisible(cm, line, diff);
            updateLineHeight(line, line.height + diff);
        });
    };
    function widgetHeight(widget) {
        if (widget.height != null) return widget.height;
        if (!contains(document.body, widget.node)) {
            var parentStyle = "position: relative;";
            if (widget.coverGutter) parentStyle += "margin-left: -" + widget.cm.getGutterElement().offsetWidth + "px;";
            removeChildrenAndAdd(widget.cm.display.measure, elt("div", [ widget.node ], null, parentStyle));
        }
        return widget.height = widget.node.offsetHeight;
    }
    function addLineWidget(cm, handle, node, options) {
        var widget = new LineWidget(cm, node, options);
        if (widget.noHScroll) cm.display.alignWidgets = true;
        changeLine(cm.doc, handle, "widget", function(line) {
            var widgets = line.widgets || (line.widgets = []);
            if (widget.insertAt == null) widgets.push(widget); else widgets.splice(Math.min(widgets.length - 1, Math.max(0, widget.insertAt)), 0, widget);
            widget.line = line;
            if (!lineIsHidden(cm.doc, line)) {
                var aboveVisible = heightAtLine(line) < cm.doc.scrollTop;
                updateLineHeight(line, line.height + widgetHeight(widget));
                if (aboveVisible) addToScrollPos(cm, null, widget.height);
                cm.curOp.forceUpdate = true;
            }
            return true;
        });
        return widget;
    }
    var Line = CodeMirror.Line = function(text, markedSpans, estimateHeight) {
        this.text = text;
        attachMarkedSpans(this, markedSpans);
        this.height = estimateHeight ? estimateHeight(this) : 1;
    };
    eventMixin(Line);
    Line.prototype.lineNo = function() {
        return lineNo(this);
    };
    function updateLine(line, text, markedSpans, estimateHeight) {
        line.text = text;
        if (line.stateAfter) line.stateAfter = null;
        if (line.styles) line.styles = null;
        if (line.order != null) line.order = null;
        detachMarkedSpans(line);
        attachMarkedSpans(line, markedSpans);
        var estHeight = estimateHeight ? estimateHeight(line) : 1;
        if (estHeight != line.height) updateLineHeight(line, estHeight);
    }
    function cleanUpLine(line) {
        line.parent = null;
        detachMarkedSpans(line);
    }
    function extractLineClasses(type, output) {
        if (type) for (;;) {
            var lineClass = type.match(/(?:^|\s+)line-(background-)?(\S+)/);
            if (!lineClass) break;
            type = type.slice(0, lineClass.index) + type.slice(lineClass.index + lineClass[0].length);
            var prop = lineClass[1] ? "bgClass" : "textClass";
            if (output[prop] == null) output[prop] = lineClass[2]; else if (!new RegExp("(?:^|s)" + lineClass[2] + "(?:$|s)").test(output[prop])) output[prop] += " " + lineClass[2];
        }
        return type;
    }
    function callBlankLine(mode, state) {
        if (mode.blankLine) return mode.blankLine(state);
        if (!mode.innerMode) return;
        var inner = CodeMirror.innerMode(mode, state);
        if (inner.mode.blankLine) return inner.mode.blankLine(inner.state);
    }
    function readToken(mode, stream, state, inner) {
        for (var i = 0; i < 10; i++) {
            if (inner) inner[0] = CodeMirror.innerMode(mode, state).mode;
            var style = mode.token(stream, state);
            if (stream.pos > stream.start) return style;
        }
        throw new Error("Mode " + mode.name + " failed to advance stream.");
    }
    function takeToken(cm, pos, precise, asArray) {
        function getObj(copy) {
            return {
                start: stream.start,
                end: stream.pos,
                string: stream.current(),
                type: style || null,
                state: copy ? copyState(doc.mode, state) : state
            };
        }
        var doc = cm.doc, mode = doc.mode, style;
        pos = clipPos(doc, pos);
        var line = getLine(doc, pos.line), state = getStateBefore(cm, pos.line, precise);
        var stream = new StringStream(line.text, cm.options.tabSize), tokens;
        if (asArray) tokens = [];
        while ((asArray || stream.pos < pos.ch) && !stream.eol()) {
            stream.start = stream.pos;
            style = readToken(mode, stream, state);
            if (asArray) tokens.push(getObj(true));
        }
        return asArray ? tokens : getObj();
    }
    function runMode(cm, text, mode, state, f, lineClasses, forceToEnd) {
        var flattenSpans = mode.flattenSpans;
        if (flattenSpans == null) flattenSpans = cm.options.flattenSpans;
        var curStart = 0, curStyle = null;
        var stream = new StringStream(text, cm.options.tabSize), style;
        var inner = cm.options.addModeClass && [ null ];
        if (text == "") extractLineClasses(callBlankLine(mode, state), lineClasses);
        while (!stream.eol()) {
            if (stream.pos > cm.options.maxHighlightLength) {
                flattenSpans = false;
                if (forceToEnd) processLine(cm, text, state, stream.pos);
                stream.pos = text.length;
                style = null;
            } else {
                style = extractLineClasses(readToken(mode, stream, state, inner), lineClasses);
            }
            if (inner) {
                var mName = inner[0].name;
                if (mName) style = "m-" + (style ? mName + " " + style : mName);
            }
            if (!flattenSpans || curStyle != style) {
                if (curStart < stream.start) f(stream.start, curStyle);
                curStart = stream.start;
                curStyle = style;
            }
            stream.start = stream.pos;
        }
        while (curStart < stream.pos) {
            var pos = Math.min(stream.pos, curStart + 5e4);
            f(pos, curStyle);
            curStart = pos;
        }
    }
    function highlightLine(cm, line, state, forceToEnd) {
        var st = [ cm.state.modeGen ], lineClasses = {};
        runMode(cm, line.text, cm.doc.mode, state, function(end, style) {
            st.push(end, style);
        }, lineClasses, forceToEnd);
        for (var o = 0; o < cm.state.overlays.length; ++o) {
            var overlay = cm.state.overlays[o], i = 1, at = 0;
            runMode(cm, line.text, overlay.mode, true, function(end, style) {
                var start = i;
                while (at < end) {
                    var i_end = st[i];
                    if (i_end > end) st.splice(i, 1, end, st[i + 1], i_end);
                    i += 2;
                    at = Math.min(end, i_end);
                }
                if (!style) return;
                if (overlay.opaque) {
                    st.splice(start, i - start, end, "cm-overlay " + style);
                    i = start + 2;
                } else {
                    for (;start < i; start += 2) {
                        var cur = st[start + 1];
                        st[start + 1] = (cur ? cur + " " : "") + "cm-overlay " + style;
                    }
                }
            }, lineClasses);
        }
        return {
            styles: st,
            classes: lineClasses.bgClass || lineClasses.textClass ? lineClasses : null
        };
    }
    function getLineStyles(cm, line, updateFrontier) {
        if (!line.styles || line.styles[0] != cm.state.modeGen) {
            var result = highlightLine(cm, line, line.stateAfter = getStateBefore(cm, lineNo(line)));
            line.styles = result.styles;
            if (result.classes) line.styleClasses = result.classes; else if (line.styleClasses) line.styleClasses = null;
            if (updateFrontier === cm.doc.frontier) cm.doc.frontier++;
        }
        return line.styles;
    }
    function processLine(cm, text, state, startAt) {
        var mode = cm.doc.mode;
        var stream = new StringStream(text, cm.options.tabSize);
        stream.start = stream.pos = startAt || 0;
        if (text == "") callBlankLine(mode, state);
        while (!stream.eol() && stream.pos <= cm.options.maxHighlightLength) {
            readToken(mode, stream, state);
            stream.start = stream.pos;
        }
    }
    var styleToClassCache = {}, styleToClassCacheWithMode = {};
    function interpretTokenStyle(style, options) {
        if (!style || /^\s*$/.test(style)) return null;
        var cache = options.addModeClass ? styleToClassCacheWithMode : styleToClassCache;
        return cache[style] || (cache[style] = style.replace(/\S+/g, "cm-$&"));
    }
    function buildLineContent(cm, lineView) {
        var content = elt("span", null, null, webkit ? "padding-right: .1px" : null);
        var builder = {
            pre: elt("pre", [ content ]),
            content: content,
            col: 0,
            pos: 0,
            cm: cm
        };
        lineView.measure = {};
        for (var i = 0; i <= (lineView.rest ? lineView.rest.length : 0); i++) {
            var line = i ? lineView.rest[i - 1] : lineView.line, order;
            builder.pos = 0;
            builder.addToken = buildToken;
            if ((ie || webkit) && cm.getOption("lineWrapping")) builder.addToken = buildTokenSplitSpaces(builder.addToken);
            if (hasBadBidiRects(cm.display.measure) && (order = getOrder(line))) builder.addToken = buildTokenBadBidi(builder.addToken, order);
            builder.map = [];
            var allowFrontierUpdate = lineView != cm.display.externalMeasured && lineNo(line);
            insertLineContent(line, builder, getLineStyles(cm, line, allowFrontierUpdate));
            if (line.styleClasses) {
                if (line.styleClasses.bgClass) builder.bgClass = joinClasses(line.styleClasses.bgClass, builder.bgClass || "");
                if (line.styleClasses.textClass) builder.textClass = joinClasses(line.styleClasses.textClass, builder.textClass || "");
            }
            if (builder.map.length == 0) builder.map.push(0, 0, builder.content.appendChild(zeroWidthElement(cm.display.measure)));
            if (i == 0) {
                lineView.measure.map = builder.map;
                lineView.measure.cache = {};
            } else {
                (lineView.measure.maps || (lineView.measure.maps = [])).push(builder.map);
                (lineView.measure.caches || (lineView.measure.caches = [])).push({});
            }
        }
        if (webkit && /\bcm-tab\b/.test(builder.content.lastChild.className)) builder.content.className = "cm-tab-wrap-hack";
        signal(cm, "renderLine", cm, lineView.line, builder.pre);
        if (builder.pre.className) builder.textClass = joinClasses(builder.pre.className, builder.textClass || "");
        return builder;
    }
    function defaultSpecialCharPlaceholder(ch) {
        var token = elt("span", "•", "cm-invalidchar");
        token.title = "\\u" + ch.charCodeAt(0).toString(16);
        return token;
    }
    function buildToken(builder, text, style, startStyle, endStyle, title) {
        if (!text) return;
        var special = builder.cm.options.specialChars, mustWrap = false;
        if (!special.test(text)) {
            builder.col += text.length;
            var content = document.createTextNode(text);
            builder.map.push(builder.pos, builder.pos + text.length, content);
            if (ie && ie_version < 9) mustWrap = true;
            builder.pos += text.length;
        } else {
            var content = document.createDocumentFragment(), pos = 0;
            while (true) {
                special.lastIndex = pos;
                var m = special.exec(text);
                var skipped = m ? m.index - pos : text.length - pos;
                if (skipped) {
                    var txt = document.createTextNode(text.slice(pos, pos + skipped));
                    if (ie && ie_version < 9) content.appendChild(elt("span", [ txt ])); else content.appendChild(txt);
                    builder.map.push(builder.pos, builder.pos + skipped, txt);
                    builder.col += skipped;
                    builder.pos += skipped;
                }
                if (!m) break;
                pos += skipped + 1;
                if (m[0] == "\t") {
                    var tabSize = builder.cm.options.tabSize, tabWidth = tabSize - builder.col % tabSize;
                    var txt = content.appendChild(elt("span", spaceStr(tabWidth), "cm-tab"));
                    builder.col += tabWidth;
                } else {
                    var txt = builder.cm.options.specialCharPlaceholder(m[0]);
                    if (ie && ie_version < 9) content.appendChild(elt("span", [ txt ])); else content.appendChild(txt);
                    builder.col += 1;
                }
                builder.map.push(builder.pos, builder.pos + 1, txt);
                builder.pos++;
            }
        }
        if (style || startStyle || endStyle || mustWrap) {
            var fullStyle = style || "";
            if (startStyle) fullStyle += startStyle;
            if (endStyle) fullStyle += endStyle;
            var token = elt("span", [ content ], fullStyle);
            if (title) token.title = title;
            return builder.content.appendChild(token);
        }
        builder.content.appendChild(content);
    }
    function buildTokenSplitSpaces(inner) {
        function split(old) {
            var out = " ";
            for (var i = 0; i < old.length - 2; ++i) out += i % 2 ? " " : " ";
            out += " ";
            return out;
        }
        return function(builder, text, style, startStyle, endStyle, title) {
            inner(builder, text.replace(/ {3,}/g, split), style, startStyle, endStyle, title);
        };
    }
    function buildTokenBadBidi(inner, order) {
        return function(builder, text, style, startStyle, endStyle, title) {
            style = style ? style + " cm-force-border" : "cm-force-border";
            var start = builder.pos, end = start + text.length;
            for (;;) {
                for (var i = 0; i < order.length; i++) {
                    var part = order[i];
                    if (part.to > start && part.from <= start) break;
                }
                if (part.to >= end) return inner(builder, text, style, startStyle, endStyle, title);
                inner(builder, text.slice(0, part.to - start), style, startStyle, null, title);
                startStyle = null;
                text = text.slice(part.to - start);
                start = part.to;
            }
        };
    }
    function buildCollapsedSpan(builder, size, marker, ignoreWidget) {
        var widget = !ignoreWidget && marker.widgetNode;
        if (widget) {
            builder.map.push(builder.pos, builder.pos + size, widget);
            builder.content.appendChild(widget);
        }
        builder.pos += size;
    }
    function insertLineContent(line, builder, styles) {
        var spans = line.markedSpans, allText = line.text, at = 0;
        if (!spans) {
            for (var i = 1; i < styles.length; i += 2) builder.addToken(builder, allText.slice(at, at = styles[i]), interpretTokenStyle(styles[i + 1], builder.cm.options));
            return;
        }
        var len = allText.length, pos = 0, i = 1, text = "", style;
        var nextChange = 0, spanStyle, spanEndStyle, spanStartStyle, title, collapsed;
        for (;;) {
            if (nextChange == pos) {
                spanStyle = spanEndStyle = spanStartStyle = title = "";
                collapsed = null;
                nextChange = Infinity;
                var foundBookmarks = [];
                for (var j = 0; j < spans.length; ++j) {
                    var sp = spans[j], m = sp.marker;
                    if (sp.from <= pos && (sp.to == null || sp.to > pos)) {
                        if (sp.to != null && nextChange > sp.to) {
                            nextChange = sp.to;
                            spanEndStyle = "";
                        }
                        if (m.className) spanStyle += " " + m.className;
                        if (m.startStyle && sp.from == pos) spanStartStyle += " " + m.startStyle;
                        if (m.endStyle && sp.to == nextChange) spanEndStyle += " " + m.endStyle;
                        if (m.title && !title) title = m.title;
                        if (m.collapsed && (!collapsed || compareCollapsedMarkers(collapsed.marker, m) < 0)) collapsed = sp;
                    } else if (sp.from > pos && nextChange > sp.from) {
                        nextChange = sp.from;
                    }
                    if (m.type == "bookmark" && sp.from == pos && m.widgetNode) foundBookmarks.push(m);
                }
                if (collapsed && (collapsed.from || 0) == pos) {
                    buildCollapsedSpan(builder, (collapsed.to == null ? len + 1 : collapsed.to) - pos, collapsed.marker, collapsed.from == null);
                    if (collapsed.to == null) return;
                }
                if (!collapsed && foundBookmarks.length) for (var j = 0; j < foundBookmarks.length; ++j) buildCollapsedSpan(builder, 0, foundBookmarks[j]);
            }
            if (pos >= len) break;
            var upto = Math.min(len, nextChange);
            while (true) {
                if (text) {
                    var end = pos + text.length;
                    if (!collapsed) {
                        var tokenText = end > upto ? text.slice(0, upto - pos) : text;
                        builder.addToken(builder, tokenText, style ? style + spanStyle : spanStyle, spanStartStyle, pos + tokenText.length == nextChange ? spanEndStyle : "", title);
                    }
                    if (end >= upto) {
                        text = text.slice(upto - pos);
                        pos = upto;
                        break;
                    }
                    pos = end;
                    spanStartStyle = "";
                }
                text = allText.slice(at, at = styles[i++]);
                style = interpretTokenStyle(styles[i++], builder.cm.options);
            }
        }
    }
    function isWholeLineUpdate(doc, change) {
        return change.from.ch == 0 && change.to.ch == 0 && lst(change.text) == "" && (!doc.cm || doc.cm.options.wholeLineUpdateBefore);
    }
    function updateDoc(doc, change, markedSpans, estimateHeight) {
        function spansFor(n) {
            return markedSpans ? markedSpans[n] : null;
        }
        function update(line, text, spans) {
            updateLine(line, text, spans, estimateHeight);
            signalLater(line, "change", line, change);
        }
        var from = change.from, to = change.to, text = change.text;
        var firstLine = getLine(doc, from.line), lastLine = getLine(doc, to.line);
        var lastText = lst(text), lastSpans = spansFor(text.length - 1), nlines = to.line - from.line;
        if (isWholeLineUpdate(doc, change)) {
            for (var i = 0, added = []; i < text.length - 1; ++i) added.push(new Line(text[i], spansFor(i), estimateHeight));
            update(lastLine, lastLine.text, lastSpans);
            if (nlines) doc.remove(from.line, nlines);
            if (added.length) doc.insert(from.line, added);
        } else if (firstLine == lastLine) {
            if (text.length == 1) {
                update(firstLine, firstLine.text.slice(0, from.ch) + lastText + firstLine.text.slice(to.ch), lastSpans);
            } else {
                for (var added = [], i = 1; i < text.length - 1; ++i) added.push(new Line(text[i], spansFor(i), estimateHeight));
                added.push(new Line(lastText + firstLine.text.slice(to.ch), lastSpans, estimateHeight));
                update(firstLine, firstLine.text.slice(0, from.ch) + text[0], spansFor(0));
                doc.insert(from.line + 1, added);
            }
        } else if (text.length == 1) {
            update(firstLine, firstLine.text.slice(0, from.ch) + text[0] + lastLine.text.slice(to.ch), spansFor(0));
            doc.remove(from.line + 1, nlines);
        } else {
            update(firstLine, firstLine.text.slice(0, from.ch) + text[0], spansFor(0));
            update(lastLine, lastText + lastLine.text.slice(to.ch), lastSpans);
            for (var i = 1, added = []; i < text.length - 1; ++i) added.push(new Line(text[i], spansFor(i), estimateHeight));
            if (nlines > 1) doc.remove(from.line + 1, nlines - 1);
            doc.insert(from.line + 1, added);
        }
        signalLater(doc, "change", doc, change);
    }
    function LeafChunk(lines) {
        this.lines = lines;
        this.parent = null;
        for (var i = 0, height = 0; i < lines.length; ++i) {
            lines[i].parent = this;
            height += lines[i].height;
        }
        this.height = height;
    }
    LeafChunk.prototype = {
        chunkSize: function() {
            return this.lines.length;
        },
        removeInner: function(at, n) {
            for (var i = at, e = at + n; i < e; ++i) {
                var line = this.lines[i];
                this.height -= line.height;
                cleanUpLine(line);
                signalLater(line, "delete");
            }
            this.lines.splice(at, n);
        },
        collapse: function(lines) {
            lines.push.apply(lines, this.lines);
        },
        insertInner: function(at, lines, height) {
            this.height += height;
            this.lines = this.lines.slice(0, at).concat(lines).concat(this.lines.slice(at));
            for (var i = 0; i < lines.length; ++i) lines[i].parent = this;
        },
        iterN: function(at, n, op) {
            for (var e = at + n; at < e; ++at) if (op(this.lines[at])) return true;
        }
    };
    function BranchChunk(children) {
        this.children = children;
        var size = 0, height = 0;
        for (var i = 0; i < children.length; ++i) {
            var ch = children[i];
            size += ch.chunkSize();
            height += ch.height;
            ch.parent = this;
        }
        this.size = size;
        this.height = height;
        this.parent = null;
    }
    BranchChunk.prototype = {
        chunkSize: function() {
            return this.size;
        },
        removeInner: function(at, n) {
            this.size -= n;
            for (var i = 0; i < this.children.length; ++i) {
                var child = this.children[i], sz = child.chunkSize();
                if (at < sz) {
                    var rm = Math.min(n, sz - at), oldHeight = child.height;
                    child.removeInner(at, rm);
                    this.height -= oldHeight - child.height;
                    if (sz == rm) {
                        this.children.splice(i--, 1);
                        child.parent = null;
                    }
                    if ((n -= rm) == 0) break;
                    at = 0;
                } else at -= sz;
            }
            if (this.size - n < 25 && (this.children.length > 1 || !(this.children[0] instanceof LeafChunk))) {
                var lines = [];
                this.collapse(lines);
                this.children = [ new LeafChunk(lines) ];
                this.children[0].parent = this;
            }
        },
        collapse: function(lines) {
            for (var i = 0; i < this.children.length; ++i) this.children[i].collapse(lines);
        },
        insertInner: function(at, lines, height) {
            this.size += lines.length;
            this.height += height;
            for (var i = 0; i < this.children.length; ++i) {
                var child = this.children[i], sz = child.chunkSize();
                if (at <= sz) {
                    child.insertInner(at, lines, height);
                    if (child.lines && child.lines.length > 50) {
                        while (child.lines.length > 50) {
                            var spilled = child.lines.splice(child.lines.length - 25, 25);
                            var newleaf = new LeafChunk(spilled);
                            child.height -= newleaf.height;
                            this.children.splice(i + 1, 0, newleaf);
                            newleaf.parent = this;
                        }
                        this.maybeSpill();
                    }
                    break;
                }
                at -= sz;
            }
        },
        maybeSpill: function() {
            if (this.children.length <= 10) return;
            var me = this;
            do {
                var spilled = me.children.splice(me.children.length - 5, 5);
                var sibling = new BranchChunk(spilled);
                if (!me.parent) {
                    var copy = new BranchChunk(me.children);
                    copy.parent = me;
                    me.children = [ copy, sibling ];
                    me = copy;
                } else {
                    me.size -= sibling.size;
                    me.height -= sibling.height;
                    var myIndex = indexOf(me.parent.children, me);
                    me.parent.children.splice(myIndex + 1, 0, sibling);
                }
                sibling.parent = me.parent;
            } while (me.children.length > 10);
            me.parent.maybeSpill();
        },
        iterN: function(at, n, op) {
            for (var i = 0; i < this.children.length; ++i) {
                var child = this.children[i], sz = child.chunkSize();
                if (at < sz) {
                    var used = Math.min(n, sz - at);
                    if (child.iterN(at, used, op)) return true;
                    if ((n -= used) == 0) break;
                    at = 0;
                } else at -= sz;
            }
        }
    };
    var nextDocId = 0;
    var Doc = CodeMirror.Doc = function(text, mode, firstLine) {
        if (!(this instanceof Doc)) return new Doc(text, mode, firstLine);
        if (firstLine == null) firstLine = 0;
        BranchChunk.call(this, [ new LeafChunk([ new Line("", null) ]) ]);
        this.first = firstLine;
        this.scrollTop = this.scrollLeft = 0;
        this.cantEdit = false;
        this.cleanGeneration = 1;
        this.frontier = firstLine;
        var start = Pos(firstLine, 0);
        this.sel = simpleSelection(start);
        this.history = new History(null);
        this.id = ++nextDocId;
        this.modeOption = mode;
        if (typeof text == "string") text = splitLines(text);
        updateDoc(this, {
            from: start,
            to: start,
            text: text
        });
        setSelection(this, simpleSelection(start), sel_dontScroll);
    };
    Doc.prototype = createObj(BranchChunk.prototype, {
        constructor: Doc,
        iter: function(from, to, op) {
            if (op) this.iterN(from - this.first, to - from, op); else this.iterN(this.first, this.first + this.size, from);
        },
        insert: function(at, lines) {
            var height = 0;
            for (var i = 0; i < lines.length; ++i) height += lines[i].height;
            this.insertInner(at - this.first, lines, height);
        },
        remove: function(at, n) {
            this.removeInner(at - this.first, n);
        },
        getValue: function(lineSep) {
            var lines = getLines(this, this.first, this.first + this.size);
            if (lineSep === false) return lines;
            return lines.join(lineSep || "\n");
        },
        setValue: docMethodOp(function(code) {
            var top = Pos(this.first, 0), last = this.first + this.size - 1;
            makeChange(this, {
                from: top,
                to: Pos(last, getLine(this, last).text.length),
                text: splitLines(code),
                origin: "setValue"
            }, true);
            setSelection(this, simpleSelection(top));
        }),
        replaceRange: function(code, from, to, origin) {
            from = clipPos(this, from);
            to = to ? clipPos(this, to) : from;
            replaceRange(this, code, from, to, origin);
        },
        getRange: function(from, to, lineSep) {
            var lines = getBetween(this, clipPos(this, from), clipPos(this, to));
            if (lineSep === false) return lines;
            return lines.join(lineSep || "\n");
        },
        getLine: function(line) {
            var l = this.getLineHandle(line);
            return l && l.text;
        },
        getLineHandle: function(line) {
            if (isLine(this, line)) return getLine(this, line);
        },
        getLineNumber: function(line) {
            return lineNo(line);
        },
        getLineHandleVisualStart: function(line) {
            if (typeof line == "number") line = getLine(this, line);
            return visualLine(line);
        },
        lineCount: function() {
            return this.size;
        },
        firstLine: function() {
            return this.first;
        },
        lastLine: function() {
            return this.first + this.size - 1;
        },
        clipPos: function(pos) {
            return clipPos(this, pos);
        },
        getCursor: function(start) {
            var range = this.sel.primary(), pos;
            if (start == null || start == "head") pos = range.head; else if (start == "anchor") pos = range.anchor; else if (start == "end" || start == "to" || start === false) pos = range.to(); else pos = range.from();
            return pos;
        },
        listSelections: function() {
            return this.sel.ranges;
        },
        somethingSelected: function() {
            return this.sel.somethingSelected();
        },
        setCursor: docMethodOp(function(line, ch, options) {
            setSimpleSelection(this, clipPos(this, typeof line == "number" ? Pos(line, ch || 0) : line), null, options);
        }),
        setSelection: docMethodOp(function(anchor, head, options) {
            setSimpleSelection(this, clipPos(this, anchor), clipPos(this, head || anchor), options);
        }),
        extendSelection: docMethodOp(function(head, other, options) {
            extendSelection(this, clipPos(this, head), other && clipPos(this, other), options);
        }),
        extendSelections: docMethodOp(function(heads, options) {
            extendSelections(this, clipPosArray(this, heads, options));
        }),
        extendSelectionsBy: docMethodOp(function(f, options) {
            extendSelections(this, map(this.sel.ranges, f), options);
        }),
        setSelections: docMethodOp(function(ranges, primary, options) {
            if (!ranges.length) return;
            for (var i = 0, out = []; i < ranges.length; i++) out[i] = new Range(clipPos(this, ranges[i].anchor), clipPos(this, ranges[i].head));
            if (primary == null) primary = Math.min(ranges.length - 1, this.sel.primIndex);
            setSelection(this, normalizeSelection(out, primary), options);
        }),
        addSelection: docMethodOp(function(anchor, head, options) {
            var ranges = this.sel.ranges.slice(0);
            ranges.push(new Range(clipPos(this, anchor), clipPos(this, head || anchor)));
            setSelection(this, normalizeSelection(ranges, ranges.length - 1), options);
        }),
        getSelection: function(lineSep) {
            var ranges = this.sel.ranges, lines;
            for (var i = 0; i < ranges.length; i++) {
                var sel = getBetween(this, ranges[i].from(), ranges[i].to());
                lines = lines ? lines.concat(sel) : sel;
            }
            if (lineSep === false) return lines; else return lines.join(lineSep || "\n");
        },
        getSelections: function(lineSep) {
            var parts = [], ranges = this.sel.ranges;
            for (var i = 0; i < ranges.length; i++) {
                var sel = getBetween(this, ranges[i].from(), ranges[i].to());
                if (lineSep !== false) sel = sel.join(lineSep || "\n");
                parts[i] = sel;
            }
            return parts;
        },
        replaceSelection: function(code, collapse, origin) {
            var dup = [];
            for (var i = 0; i < this.sel.ranges.length; i++) dup[i] = code;
            this.replaceSelections(dup, collapse, origin || "+input");
        },
        replaceSelections: docMethodOp(function(code, collapse, origin) {
            var changes = [], sel = this.sel;
            for (var i = 0; i < sel.ranges.length; i++) {
                var range = sel.ranges[i];
                changes[i] = {
                    from: range.from(),
                    to: range.to(),
                    text: splitLines(code[i]),
                    origin: origin
                };
            }
            var newSel = collapse && collapse != "end" && computeReplacedSel(this, changes, collapse);
            for (var i = changes.length - 1; i >= 0; i--) makeChange(this, changes[i]);
            if (newSel) setSelectionReplaceHistory(this, newSel); else if (this.cm) ensureCursorVisible(this.cm);
        }),
        undo: docMethodOp(function() {
            makeChangeFromHistory(this, "undo");
        }),
        redo: docMethodOp(function() {
            makeChangeFromHistory(this, "redo");
        }),
        undoSelection: docMethodOp(function() {
            makeChangeFromHistory(this, "undo", true);
        }),
        redoSelection: docMethodOp(function() {
            makeChangeFromHistory(this, "redo", true);
        }),
        setExtending: function(val) {
            this.extend = val;
        },
        getExtending: function() {
            return this.extend;
        },
        historySize: function() {
            var hist = this.history, done = 0, undone = 0;
            for (var i = 0; i < hist.done.length; i++) if (!hist.done[i].ranges) ++done;
            for (var i = 0; i < hist.undone.length; i++) if (!hist.undone[i].ranges) ++undone;
            return {
                undo: done,
                redo: undone
            };
        },
        clearHistory: function() {
            this.history = new History(this.history.maxGeneration);
        },
        markClean: function() {
            this.cleanGeneration = this.changeGeneration(true);
        },
        changeGeneration: function(forceSplit) {
            if (forceSplit) this.history.lastOp = this.history.lastSelOp = this.history.lastOrigin = null;
            return this.history.generation;
        },
        isClean: function(gen) {
            return this.history.generation == (gen || this.cleanGeneration);
        },
        getHistory: function() {
            return {
                done: copyHistoryArray(this.history.done),
                undone: copyHistoryArray(this.history.undone)
            };
        },
        setHistory: function(histData) {
            var hist = this.history = new History(this.history.maxGeneration);
            hist.done = copyHistoryArray(histData.done.slice(0), null, true);
            hist.undone = copyHistoryArray(histData.undone.slice(0), null, true);
        },
        addLineClass: docMethodOp(function(handle, where, cls) {
            return changeLine(this, handle, where == "gutter" ? "gutter" : "class", function(line) {
                var prop = where == "text" ? "textClass" : where == "background" ? "bgClass" : where == "gutter" ? "gutterClass" : "wrapClass";
                if (!line[prop]) line[prop] = cls; else if (classTest(cls).test(line[prop])) return false; else line[prop] += " " + cls;
                return true;
            });
        }),
        removeLineClass: docMethodOp(function(handle, where, cls) {
            return changeLine(this, handle, "class", function(line) {
                var prop = where == "text" ? "textClass" : where == "background" ? "bgClass" : where == "gutter" ? "gutterClass" : "wrapClass";
                var cur = line[prop];
                if (!cur) return false; else if (cls == null) line[prop] = null; else {
                    var found = cur.match(classTest(cls));
                    if (!found) return false;
                    var end = found.index + found[0].length;
                    line[prop] = cur.slice(0, found.index) + (!found.index || end == cur.length ? "" : " ") + cur.slice(end) || null;
                }
                return true;
            });
        }),
        markText: function(from, to, options) {
            return markText(this, clipPos(this, from), clipPos(this, to), options, "range");
        },
        setBookmark: function(pos, options) {
            var realOpts = {
                replacedWith: options && (options.nodeType == null ? options.widget : options),
                insertLeft: options && options.insertLeft,
                clearWhenEmpty: false,
                shared: options && options.shared
            };
            pos = clipPos(this, pos);
            return markText(this, pos, pos, realOpts, "bookmark");
        },
        findMarksAt: function(pos) {
            pos = clipPos(this, pos);
            var markers = [], spans = getLine(this, pos.line).markedSpans;
            if (spans) for (var i = 0; i < spans.length; ++i) {
                var span = spans[i];
                if ((span.from == null || span.from <= pos.ch) && (span.to == null || span.to >= pos.ch)) markers.push(span.marker.parent || span.marker);
            }
            return markers;
        },
        findMarks: function(from, to, filter) {
            from = clipPos(this, from);
            to = clipPos(this, to);
            var found = [], lineNo = from.line;
            this.iter(from.line, to.line + 1, function(line) {
                var spans = line.markedSpans;
                if (spans) for (var i = 0; i < spans.length; i++) {
                    var span = spans[i];
                    if (!(lineNo == from.line && from.ch > span.to || span.from == null && lineNo != from.line || lineNo == to.line && span.from > to.ch) && (!filter || filter(span.marker))) found.push(span.marker.parent || span.marker);
                }
                ++lineNo;
            });
            return found;
        },
        getAllMarks: function() {
            var markers = [];
            this.iter(function(line) {
                var sps = line.markedSpans;
                if (sps) for (var i = 0; i < sps.length; ++i) if (sps[i].from != null) markers.push(sps[i].marker);
            });
            return markers;
        },
        posFromIndex: function(off) {
            var ch, lineNo = this.first;
            this.iter(function(line) {
                var sz = line.text.length + 1;
                if (sz > off) {
                    ch = off;
                    return true;
                }
                off -= sz;
                ++lineNo;
            });
            return clipPos(this, Pos(lineNo, ch));
        },
        indexFromPos: function(coords) {
            coords = clipPos(this, coords);
            var index = coords.ch;
            if (coords.line < this.first || coords.ch < 0) return 0;
            this.iter(this.first, coords.line, function(line) {
                index += line.text.length + 1;
            });
            return index;
        },
        copy: function(copyHistory) {
            var doc = new Doc(getLines(this, this.first, this.first + this.size), this.modeOption, this.first);
            doc.scrollTop = this.scrollTop;
            doc.scrollLeft = this.scrollLeft;
            doc.sel = this.sel;
            doc.extend = false;
            if (copyHistory) {
                doc.history.undoDepth = this.history.undoDepth;
                doc.setHistory(this.getHistory());
            }
            return doc;
        },
        linkedDoc: function(options) {
            if (!options) options = {};
            var from = this.first, to = this.first + this.size;
            if (options.from != null && options.from > from) from = options.from;
            if (options.to != null && options.to < to) to = options.to;
            var copy = new Doc(getLines(this, from, to), options.mode || this.modeOption, from);
            if (options.sharedHist) copy.history = this.history;
            (this.linked || (this.linked = [])).push({
                doc: copy,
                sharedHist: options.sharedHist
            });
            copy.linked = [ {
                doc: this,
                isParent: true,
                sharedHist: options.sharedHist
            } ];
            copySharedMarkers(copy, findSharedMarkers(this));
            return copy;
        },
        unlinkDoc: function(other) {
            if (other instanceof CodeMirror) other = other.doc;
            if (this.linked) for (var i = 0; i < this.linked.length; ++i) {
                var link = this.linked[i];
                if (link.doc != other) continue;
                this.linked.splice(i, 1);
                other.unlinkDoc(this);
                detachSharedMarkers(findSharedMarkers(this));
                break;
            }
            if (other.history == this.history) {
                var splitIds = [ other.id ];
                linkedDocs(other, function(doc) {
                    splitIds.push(doc.id);
                }, true);
                other.history = new History(null);
                other.history.done = copyHistoryArray(this.history.done, splitIds);
                other.history.undone = copyHistoryArray(this.history.undone, splitIds);
            }
        },
        iterLinkedDocs: function(f) {
            linkedDocs(this, f);
        },
        getMode: function() {
            return this.mode;
        },
        getEditor: function() {
            return this.cm;
        }
    });
    Doc.prototype.eachLine = Doc.prototype.iter;
    var dontDelegate = "iter insert remove copy getEditor".split(" ");
    for (var prop in Doc.prototype) if (Doc.prototype.hasOwnProperty(prop) && indexOf(dontDelegate, prop) < 0) CodeMirror.prototype[prop] = function(method) {
        return function() {
            return method.apply(this.doc, arguments);
        };
    }(Doc.prototype[prop]);
    eventMixin(Doc);
    function linkedDocs(doc, f, sharedHistOnly) {
        function propagate(doc, skip, sharedHist) {
            if (doc.linked) for (var i = 0; i < doc.linked.length; ++i) {
                var rel = doc.linked[i];
                if (rel.doc == skip) continue;
                var shared = sharedHist && rel.sharedHist;
                if (sharedHistOnly && !shared) continue;
                f(rel.doc, shared);
                propagate(rel.doc, doc, shared);
            }
        }
        propagate(doc, null, true);
    }
    function attachDoc(cm, doc) {
        if (doc.cm) throw new Error("This document is already in use.");
        cm.doc = doc;
        doc.cm = cm;
        estimateLineHeights(cm);
        loadMode(cm);
        if (!cm.options.lineWrapping) findMaxLine(cm);
        cm.options.mode = doc.modeOption;
        regChange(cm);
    }
    function getLine(doc, n) {
        n -= doc.first;
        if (n < 0 || n >= doc.size) throw new Error("There is no line " + (n + doc.first) + " in the document.");
        for (var chunk = doc; !chunk.lines; ) {
            for (var i = 0; ;++i) {
                var child = chunk.children[i], sz = child.chunkSize();
                if (n < sz) {
                    chunk = child;
                    break;
                }
                n -= sz;
            }
        }
        return chunk.lines[n];
    }
    function getBetween(doc, start, end) {
        var out = [], n = start.line;
        doc.iter(start.line, end.line + 1, function(line) {
            var text = line.text;
            if (n == end.line) text = text.slice(0, end.ch);
            if (n == start.line) text = text.slice(start.ch);
            out.push(text);
            ++n;
        });
        return out;
    }
    function getLines(doc, from, to) {
        var out = [];
        doc.iter(from, to, function(line) {
            out.push(line.text);
        });
        return out;
    }
    function updateLineHeight(line, height) {
        var diff = height - line.height;
        if (diff) for (var n = line; n; n = n.parent) n.height += diff;
    }
    function lineNo(line) {
        if (line.parent == null) return null;
        var cur = line.parent, no = indexOf(cur.lines, line);
        for (var chunk = cur.parent; chunk; cur = chunk, chunk = chunk.parent) {
            for (var i = 0; ;++i) {
                if (chunk.children[i] == cur) break;
                no += chunk.children[i].chunkSize();
            }
        }
        return no + cur.first;
    }
    function lineAtHeight(chunk, h) {
        var n = chunk.first;
        outer: do {
            for (var i = 0; i < chunk.children.length; ++i) {
                var child = chunk.children[i], ch = child.height;
                if (h < ch) {
                    chunk = child;
                    continue outer;
                }
                h -= ch;
                n += child.chunkSize();
            }
            return n;
        } while (!chunk.lines);
        for (var i = 0; i < chunk.lines.length; ++i) {
            var line = chunk.lines[i], lh = line.height;
            if (h < lh) break;
            h -= lh;
        }
        return n + i;
    }
    function heightAtLine(lineObj) {
        lineObj = visualLine(lineObj);
        var h = 0, chunk = lineObj.parent;
        for (var i = 0; i < chunk.lines.length; ++i) {
            var line = chunk.lines[i];
            if (line == lineObj) break; else h += line.height;
        }
        for (var p = chunk.parent; p; chunk = p, p = chunk.parent) {
            for (var i = 0; i < p.children.length; ++i) {
                var cur = p.children[i];
                if (cur == chunk) break; else h += cur.height;
            }
        }
        return h;
    }
    function getOrder(line) {
        var order = line.order;
        if (order == null) order = line.order = bidiOrdering(line.text);
        return order;
    }
    function History(startGen) {
        this.done = [];
        this.undone = [];
        this.undoDepth = Infinity;
        this.lastModTime = this.lastSelTime = 0;
        this.lastOp = this.lastSelOp = null;
        this.lastOrigin = this.lastSelOrigin = null;
        this.generation = this.maxGeneration = startGen || 1;
    }
    function historyChangeFromChange(doc, change) {
        var histChange = {
            from: copyPos(change.from),
            to: changeEnd(change),
            text: getBetween(doc, change.from, change.to)
        };
        attachLocalSpans(doc, histChange, change.from.line, change.to.line + 1);
        linkedDocs(doc, function(doc) {
            attachLocalSpans(doc, histChange, change.from.line, change.to.line + 1);
        }, true);
        return histChange;
    }
    function clearSelectionEvents(array) {
        while (array.length) {
            var last = lst(array);
            if (last.ranges) array.pop(); else break;
        }
    }
    function lastChangeEvent(hist, force) {
        if (force) {
            clearSelectionEvents(hist.done);
            return lst(hist.done);
        } else if (hist.done.length && !lst(hist.done).ranges) {
            return lst(hist.done);
        } else if (hist.done.length > 1 && !hist.done[hist.done.length - 2].ranges) {
            hist.done.pop();
            return lst(hist.done);
        }
    }
    function addChangeToHistory(doc, change, selAfter, opId) {
        var hist = doc.history;
        hist.undone.length = 0;
        var time = +new Date(), cur;
        if ((hist.lastOp == opId || hist.lastOrigin == change.origin && change.origin && (change.origin.charAt(0) == "+" && doc.cm && hist.lastModTime > time - doc.cm.options.historyEventDelay || change.origin.charAt(0) == "*")) && (cur = lastChangeEvent(hist, hist.lastOp == opId))) {
            var last = lst(cur.changes);
            if (cmp(change.from, change.to) == 0 && cmp(change.from, last.to) == 0) {
                last.to = changeEnd(change);
            } else {
                cur.changes.push(historyChangeFromChange(doc, change));
            }
        } else {
            var before = lst(hist.done);
            if (!before || !before.ranges) pushSelectionToHistory(doc.sel, hist.done);
            cur = {
                changes: [ historyChangeFromChange(doc, change) ],
                generation: hist.generation
            };
            hist.done.push(cur);
            while (hist.done.length > hist.undoDepth) {
                hist.done.shift();
                if (!hist.done[0].ranges) hist.done.shift();
            }
        }
        hist.done.push(selAfter);
        hist.generation = ++hist.maxGeneration;
        hist.lastModTime = hist.lastSelTime = time;
        hist.lastOp = hist.lastSelOp = opId;
        hist.lastOrigin = hist.lastSelOrigin = change.origin;
        if (!last) signal(doc, "historyAdded");
    }
    function selectionEventCanBeMerged(doc, origin, prev, sel) {
        var ch = origin.charAt(0);
        return ch == "*" || ch == "+" && prev.ranges.length == sel.ranges.length && prev.somethingSelected() == sel.somethingSelected() && new Date() - doc.history.lastSelTime <= (doc.cm ? doc.cm.options.historyEventDelay : 500);
    }
    function addSelectionToHistory(doc, sel, opId, options) {
        var hist = doc.history, origin = options && options.origin;
        if (opId == hist.lastSelOp || origin && hist.lastSelOrigin == origin && (hist.lastModTime == hist.lastSelTime && hist.lastOrigin == origin || selectionEventCanBeMerged(doc, origin, lst(hist.done), sel))) hist.done[hist.done.length - 1] = sel; else pushSelectionToHistory(sel, hist.done);
        hist.lastSelTime = +new Date();
        hist.lastSelOrigin = origin;
        hist.lastSelOp = opId;
        if (options && options.clearRedo !== false) clearSelectionEvents(hist.undone);
    }
    function pushSelectionToHistory(sel, dest) {
        var top = lst(dest);
        if (!(top && top.ranges && top.equals(sel))) dest.push(sel);
    }
    function attachLocalSpans(doc, change, from, to) {
        var existing = change["spans_" + doc.id], n = 0;
        doc.iter(Math.max(doc.first, from), Math.min(doc.first + doc.size, to), function(line) {
            if (line.markedSpans) (existing || (existing = change["spans_" + doc.id] = {}))[n] = line.markedSpans;
            ++n;
        });
    }
    function removeClearedSpans(spans) {
        if (!spans) return null;
        for (var i = 0, out; i < spans.length; ++i) {
            if (spans[i].marker.explicitlyCleared) {
                if (!out) out = spans.slice(0, i);
            } else if (out) out.push(spans[i]);
        }
        return !out ? spans : out.length ? out : null;
    }
    function getOldSpans(doc, change) {
        var found = change["spans_" + doc.id];
        if (!found) return null;
        for (var i = 0, nw = []; i < change.text.length; ++i) nw.push(removeClearedSpans(found[i]));
        return nw;
    }
    function copyHistoryArray(events, newGroup, instantiateSel) {
        for (var i = 0, copy = []; i < events.length; ++i) {
            var event = events[i];
            if (event.ranges) {
                copy.push(instantiateSel ? Selection.prototype.deepCopy.call(event) : event);
                continue;
            }
            var changes = event.changes, newChanges = [];
            copy.push({
                changes: newChanges
            });
            for (var j = 0; j < changes.length; ++j) {
                var change = changes[j], m;
                newChanges.push({
                    from: change.from,
                    to: change.to,
                    text: change.text
                });
                if (newGroup) for (var prop in change) if (m = prop.match(/^spans_(\d+)$/)) {
                    if (indexOf(newGroup, Number(m[1])) > -1) {
                        lst(newChanges)[prop] = change[prop];
                        delete change[prop];
                    }
                }
            }
        }
        return copy;
    }
    function rebaseHistSelSingle(pos, from, to, diff) {
        if (to < pos.line) {
            pos.line += diff;
        } else if (from < pos.line) {
            pos.line = from;
            pos.ch = 0;
        }
    }
    function rebaseHistArray(array, from, to, diff) {
        for (var i = 0; i < array.length; ++i) {
            var sub = array[i], ok = true;
            if (sub.ranges) {
                if (!sub.copied) {
                    sub = array[i] = sub.deepCopy();
                    sub.copied = true;
                }
                for (var j = 0; j < sub.ranges.length; j++) {
                    rebaseHistSelSingle(sub.ranges[j].anchor, from, to, diff);
                    rebaseHistSelSingle(sub.ranges[j].head, from, to, diff);
                }
                continue;
            }
            for (var j = 0; j < sub.changes.length; ++j) {
                var cur = sub.changes[j];
                if (to < cur.from.line) {
                    cur.from = Pos(cur.from.line + diff, cur.from.ch);
                    cur.to = Pos(cur.to.line + diff, cur.to.ch);
                } else if (from <= cur.to.line) {
                    ok = false;
                    break;
                }
            }
            if (!ok) {
                array.splice(0, i + 1);
                i = 0;
            }
        }
    }
    function rebaseHist(hist, change) {
        var from = change.from.line, to = change.to.line, diff = change.text.length - (to - from) - 1;
        rebaseHistArray(hist.done, from, to, diff);
        rebaseHistArray(hist.undone, from, to, diff);
    }
    var e_preventDefault = CodeMirror.e_preventDefault = function(e) {
        if (e.preventDefault) e.preventDefault(); else e.returnValue = false;
    };
    var e_stopPropagation = CodeMirror.e_stopPropagation = function(e) {
        if (e.stopPropagation) e.stopPropagation(); else e.cancelBubble = true;
    };
    function e_defaultPrevented(e) {
        return e.defaultPrevented != null ? e.defaultPrevented : e.returnValue == false;
    }
    var e_stop = CodeMirror.e_stop = function(e) {
        e_preventDefault(e);
        e_stopPropagation(e);
    };
    function e_target(e) {
        return e.target || e.srcElement;
    }
    function e_button(e) {
        var b = e.which;
        if (b == null) {
            if (e.button & 1) b = 1; else if (e.button & 2) b = 3; else if (e.button & 4) b = 2;
        }
        if (mac && e.ctrlKey && b == 1) b = 3;
        return b;
    }
    var on = CodeMirror.on = function(emitter, type, f) {
        if (emitter.addEventListener) emitter.addEventListener(type, f, false); else if (emitter.attachEvent) emitter.attachEvent("on" + type, f); else {
            var map = emitter._handlers || (emitter._handlers = {});
            var arr = map[type] || (map[type] = []);
            arr.push(f);
        }
    };
    var off = CodeMirror.off = function(emitter, type, f) {
        if (emitter.removeEventListener) emitter.removeEventListener(type, f, false); else if (emitter.detachEvent) emitter.detachEvent("on" + type, f); else {
            var arr = emitter._handlers && emitter._handlers[type];
            if (!arr) return;
            for (var i = 0; i < arr.length; ++i) if (arr[i] == f) {
                arr.splice(i, 1);
                break;
            }
        }
    };
    var signal = CodeMirror.signal = function(emitter, type) {
        var arr = emitter._handlers && emitter._handlers[type];
        if (!arr) return;
        var args = Array.prototype.slice.call(arguments, 2);
        for (var i = 0; i < arr.length; ++i) arr[i].apply(null, args);
    };
    var orphanDelayedCallbacks = null;
    function signalLater(emitter, type) {
        var arr = emitter._handlers && emitter._handlers[type];
        if (!arr) return;
        var args = Array.prototype.slice.call(arguments, 2), list;
        if (operationGroup) {
            list = operationGroup.delayedCallbacks;
        } else if (orphanDelayedCallbacks) {
            list = orphanDelayedCallbacks;
        } else {
            list = orphanDelayedCallbacks = [];
            setTimeout(fireOrphanDelayed, 0);
        }
        function bnd(f) {
            return function() {
                f.apply(null, args);
            };
        }
        for (var i = 0; i < arr.length; ++i) list.push(bnd(arr[i]));
    }
    function fireOrphanDelayed() {
        var delayed = orphanDelayedCallbacks;
        orphanDelayedCallbacks = null;
        for (var i = 0; i < delayed.length; ++i) delayed[i]();
    }
    function signalDOMEvent(cm, e, override) {
        if (typeof e == "string") e = {
            type: e,
            preventDefault: function() {
                this.defaultPrevented = true;
            }
        };
        signal(cm, override || e.type, cm, e);
        return e_defaultPrevented(e) || e.codemirrorIgnore;
    }
    function signalCursorActivity(cm) {
        var arr = cm._handlers && cm._handlers.cursorActivity;
        if (!arr) return;
        var set = cm.curOp.cursorActivityHandlers || (cm.curOp.cursorActivityHandlers = []);
        for (var i = 0; i < arr.length; ++i) if (indexOf(set, arr[i]) == -1) set.push(arr[i]);
    }
    function hasHandler(emitter, type) {
        var arr = emitter._handlers && emitter._handlers[type];
        return arr && arr.length > 0;
    }
    function eventMixin(ctor) {
        ctor.prototype.on = function(type, f) {
            on(this, type, f);
        };
        ctor.prototype.off = function(type, f) {
            off(this, type, f);
        };
    }
    var scrollerCutOff = 30;
    var Pass = CodeMirror.Pass = {
        toString: function() {
            return "CodeMirror.Pass";
        }
    };
    var sel_dontScroll = {
        scroll: false
    }, sel_mouse = {
        origin: "*mouse"
    }, sel_move = {
        origin: "+move"
    };
    function Delayed() {
        this.id = null;
    }
    Delayed.prototype.set = function(ms, f) {
        clearTimeout(this.id);
        this.id = setTimeout(f, ms);
    };
    var countColumn = CodeMirror.countColumn = function(string, end, tabSize, startIndex, startValue) {
        if (end == null) {
            end = string.search(/[^\s\u00a0]/);
            if (end == -1) end = string.length;
        }
        for (var i = startIndex || 0, n = startValue || 0; ;) {
            var nextTab = string.indexOf("\t", i);
            if (nextTab < 0 || nextTab >= end) return n + (end - i);
            n += nextTab - i;
            n += tabSize - n % tabSize;
            i = nextTab + 1;
        }
    };
    function findColumn(string, goal, tabSize) {
        for (var pos = 0, col = 0; ;) {
            var nextTab = string.indexOf("\t", pos);
            if (nextTab == -1) nextTab = string.length;
            var skipped = nextTab - pos;
            if (nextTab == string.length || col + skipped >= goal) return pos + Math.min(skipped, goal - col);
            col += nextTab - pos;
            col += tabSize - col % tabSize;
            pos = nextTab + 1;
            if (col >= goal) return pos;
        }
    }
    var spaceStrs = [ "" ];
    function spaceStr(n) {
        while (spaceStrs.length <= n) spaceStrs.push(lst(spaceStrs) + " ");
        return spaceStrs[n];
    }
    function lst(arr) {
        return arr[arr.length - 1];
    }
    var selectInput = function(node) {
        node.select();
    };
    if (ios) selectInput = function(node) {
        node.selectionStart = 0;
        node.selectionEnd = node.value.length;
    }; else if (ie) selectInput = function(node) {
        try {
            node.select();
        } catch (_e) {}
    };
    function indexOf(array, elt) {
        for (var i = 0; i < array.length; ++i) if (array[i] == elt) return i;
        return -1;
    }
    if ([].indexOf) indexOf = function(array, elt) {
        return array.indexOf(elt);
    };
    function map(array, f) {
        var out = [];
        for (var i = 0; i < array.length; i++) out[i] = f(array[i], i);
        return out;
    }
    if ([].map) map = function(array, f) {
        return array.map(f);
    };
    function createObj(base, props) {
        var inst;
        if (Object.create) {
            inst = Object.create(base);
        } else {
            var ctor = function() {};
            ctor.prototype = base;
            inst = new ctor();
        }
        if (props) copyObj(props, inst);
        return inst;
    }
    function copyObj(obj, target, overwrite) {
        if (!target) target = {};
        for (var prop in obj) if (obj.hasOwnProperty(prop) && (overwrite !== false || !target.hasOwnProperty(prop))) target[prop] = obj[prop];
        return target;
    }
    function bind(f) {
        var args = Array.prototype.slice.call(arguments, 1);
        return function() {
            return f.apply(null, args);
        };
    }
    var nonASCIISingleCaseWordChar = /[\u00df\u0590-\u05f4\u0600-\u06ff\u3040-\u309f\u30a0-\u30ff\u3400-\u4db5\u4e00-\u9fcc\uac00-\ud7af]/;
    var isWordCharBasic = CodeMirror.isWordChar = function(ch) {
        return /\w/.test(ch) || ch > "" && (ch.toUpperCase() != ch.toLowerCase() || nonASCIISingleCaseWordChar.test(ch));
    };
    function isWordChar(ch, helper) {
        if (!helper) return isWordCharBasic(ch);
        if (helper.source.indexOf("\\w") > -1 && isWordCharBasic(ch)) return true;
        return helper.test(ch);
    }
    function isEmpty(obj) {
        for (var n in obj) if (obj.hasOwnProperty(n) && obj[n]) return false;
        return true;
    }
    var extendingChars = /[\u0300-\u036f\u0483-\u0489\u0591-\u05bd\u05bf\u05c1\u05c2\u05c4\u05c5\u05c7\u0610-\u061a\u064b-\u065e\u0670\u06d6-\u06dc\u06de-\u06e4\u06e7\u06e8\u06ea-\u06ed\u0711\u0730-\u074a\u07a6-\u07b0\u07eb-\u07f3\u0816-\u0819\u081b-\u0823\u0825-\u0827\u0829-\u082d\u0900-\u0902\u093c\u0941-\u0948\u094d\u0951-\u0955\u0962\u0963\u0981\u09bc\u09be\u09c1-\u09c4\u09cd\u09d7\u09e2\u09e3\u0a01\u0a02\u0a3c\u0a41\u0a42\u0a47\u0a48\u0a4b-\u0a4d\u0a51\u0a70\u0a71\u0a75\u0a81\u0a82\u0abc\u0ac1-\u0ac5\u0ac7\u0ac8\u0acd\u0ae2\u0ae3\u0b01\u0b3c\u0b3e\u0b3f\u0b41-\u0b44\u0b4d\u0b56\u0b57\u0b62\u0b63\u0b82\u0bbe\u0bc0\u0bcd\u0bd7\u0c3e-\u0c40\u0c46-\u0c48\u0c4a-\u0c4d\u0c55\u0c56\u0c62\u0c63\u0cbc\u0cbf\u0cc2\u0cc6\u0ccc\u0ccd\u0cd5\u0cd6\u0ce2\u0ce3\u0d3e\u0d41-\u0d44\u0d4d\u0d57\u0d62\u0d63\u0dca\u0dcf\u0dd2-\u0dd4\u0dd6\u0ddf\u0e31\u0e34-\u0e3a\u0e47-\u0e4e\u0eb1\u0eb4-\u0eb9\u0ebb\u0ebc\u0ec8-\u0ecd\u0f18\u0f19\u0f35\u0f37\u0f39\u0f71-\u0f7e\u0f80-\u0f84\u0f86\u0f87\u0f90-\u0f97\u0f99-\u0fbc\u0fc6\u102d-\u1030\u1032-\u1037\u1039\u103a\u103d\u103e\u1058\u1059\u105e-\u1060\u1071-\u1074\u1082\u1085\u1086\u108d\u109d\u135f\u1712-\u1714\u1732-\u1734\u1752\u1753\u1772\u1773\u17b7-\u17bd\u17c6\u17c9-\u17d3\u17dd\u180b-\u180d\u18a9\u1920-\u1922\u1927\u1928\u1932\u1939-\u193b\u1a17\u1a18\u1a56\u1a58-\u1a5e\u1a60\u1a62\u1a65-\u1a6c\u1a73-\u1a7c\u1a7f\u1b00-\u1b03\u1b34\u1b36-\u1b3a\u1b3c\u1b42\u1b6b-\u1b73\u1b80\u1b81\u1ba2-\u1ba5\u1ba8\u1ba9\u1c2c-\u1c33\u1c36\u1c37\u1cd0-\u1cd2\u1cd4-\u1ce0\u1ce2-\u1ce8\u1ced\u1dc0-\u1de6\u1dfd-\u1dff\u200c\u200d\u20d0-\u20f0\u2cef-\u2cf1\u2de0-\u2dff\u302a-\u302f\u3099\u309a\ua66f-\ua672\ua67c\ua67d\ua6f0\ua6f1\ua802\ua806\ua80b\ua825\ua826\ua8c4\ua8e0-\ua8f1\ua926-\ua92d\ua947-\ua951\ua980-\ua982\ua9b3\ua9b6-\ua9b9\ua9bc\uaa29-\uaa2e\uaa31\uaa32\uaa35\uaa36\uaa43\uaa4c\uaab0\uaab2-\uaab4\uaab7\uaab8\uaabe\uaabf\uaac1\uabe5\uabe8\uabed\udc00-\udfff\ufb1e\ufe00-\ufe0f\ufe20-\ufe26\uff9e\uff9f]/;
    function isExtendingChar(ch) {
        return ch.charCodeAt(0) >= 768 && extendingChars.test(ch);
    }
    function elt(tag, content, className, style) {
        var e = document.createElement(tag);
        if (className) e.className = className;
        if (style) e.style.cssText = style;
        if (typeof content == "string") e.appendChild(document.createTextNode(content)); else if (content) for (var i = 0; i < content.length; ++i) e.appendChild(content[i]);
        return e;
    }
    var range;
    if (document.createRange) range = function(node, start, end) {
        var r = document.createRange();
        r.setEnd(node, end);
        r.setStart(node, start);
        return r;
    }; else range = function(node, start, end) {
        var r = document.body.createTextRange();
        try {
            r.moveToElementText(node.parentNode);
        } catch (e) {
            return r;
        }
        r.collapse(true);
        r.moveEnd("character", end);
        r.moveStart("character", start);
        return r;
    };
    function removeChildren(e) {
        for (var count = e.childNodes.length; count > 0; --count) e.removeChild(e.firstChild);
        return e;
    }
    function removeChildrenAndAdd(parent, e) {
        return removeChildren(parent).appendChild(e);
    }
    function contains(parent, child) {
        if (parent.contains) return parent.contains(child);
        while (child = child.parentNode) if (child == parent) return true;
    }
    function activeElt() {
        return document.activeElement;
    }
    if (ie && ie_version < 11) activeElt = function() {
        try {
            return document.activeElement;
        } catch (e) {
            return document.body;
        }
    };
    function classTest(cls) {
        return new RegExp("(^|\\s)" + cls + "(?:$|\\s)\\s*");
    }
    var rmClass = CodeMirror.rmClass = function(node, cls) {
        var current = node.className;
        var match = classTest(cls).exec(current);
        if (match) {
            var after = current.slice(match.index + match[0].length);
            node.className = current.slice(0, match.index) + (after ? match[1] + after : "");
        }
    };
    var addClass = CodeMirror.addClass = function(node, cls) {
        var current = node.className;
        if (!classTest(cls).test(current)) node.className += (current ? " " : "") + cls;
    };
    function joinClasses(a, b) {
        var as = a.split(" ");
        for (var i = 0; i < as.length; i++) if (as[i] && !classTest(as[i]).test(b)) b += " " + as[i];
        return b;
    }
    function forEachCodeMirror(f) {
        if (!document.body.getElementsByClassName) return;
        var byClass = document.body.getElementsByClassName("CodeMirror");
        for (var i = 0; i < byClass.length; i++) {
            var cm = byClass[i].CodeMirror;
            if (cm) f(cm);
        }
    }
    var globalsRegistered = false;
    function ensureGlobalHandlers() {
        if (globalsRegistered) return;
        registerGlobalHandlers();
        globalsRegistered = true;
    }
    function registerGlobalHandlers() {
        var resizeTimer;
        on(window, "resize", function() {
            if (resizeTimer == null) resizeTimer = setTimeout(function() {
                resizeTimer = null;
                knownScrollbarWidth = null;
                forEachCodeMirror(onResize);
            }, 100);
        });
        on(window, "blur", function() {
            forEachCodeMirror(onBlur);
        });
    }
    var dragAndDrop = function() {
        if (ie && ie_version < 9) return false;
        var div = elt("div");
        return "draggable" in div || "dragDrop" in div;
    }();
    var knownScrollbarWidth;
    function scrollbarWidth(measure) {
        if (knownScrollbarWidth != null) return knownScrollbarWidth;
        var test = elt("div", null, null, "width: 50px; height: 50px; overflow-x: scroll");
        removeChildrenAndAdd(measure, test);
        if (test.offsetWidth) knownScrollbarWidth = test.offsetHeight - test.clientHeight;
        return knownScrollbarWidth || 0;
    }
    var zwspSupported;
    function zeroWidthElement(measure) {
        if (zwspSupported == null) {
            var test = elt("span", "​");
            removeChildrenAndAdd(measure, elt("span", [ test, document.createTextNode("x") ]));
            if (measure.firstChild.offsetHeight != 0) zwspSupported = test.offsetWidth <= 1 && test.offsetHeight > 2 && !(ie && ie_version < 8);
        }
        if (zwspSupported) return elt("span", "​"); else return elt("span", " ", null, "display: inline-block; width: 1px; margin-right: -1px");
    }
    var badBidiRects;
    function hasBadBidiRects(measure) {
        if (badBidiRects != null) return badBidiRects;
        var txt = removeChildrenAndAdd(measure, document.createTextNode("AخA"));
        var r0 = range(txt, 0, 1).getBoundingClientRect();
        if (!r0 || r0.left == r0.right) return false;
        var r1 = range(txt, 1, 2).getBoundingClientRect();
        return badBidiRects = r1.right - r0.right < 3;
    }
    var splitLines = CodeMirror.splitLines = "\n\nb".split(/\n/).length != 3 ? function(string) {
        var pos = 0, result = [], l = string.length;
        while (pos <= l) {
            var nl = string.indexOf("\n", pos);
            if (nl == -1) nl = string.length;
            var line = string.slice(pos, string.charAt(nl - 1) == "\r" ? nl - 1 : nl);
            var rt = line.indexOf("\r");
            if (rt != -1) {
                result.push(line.slice(0, rt));
                pos += rt + 1;
            } else {
                result.push(line);
                pos = nl + 1;
            }
        }
        return result;
    } : function(string) {
        return string.split(/\r\n?|\n/);
    };
    var hasSelection = window.getSelection ? function(te) {
        try {
            return te.selectionStart != te.selectionEnd;
        } catch (e) {
            return false;
        }
    } : function(te) {
        try {
            var range = te.ownerDocument.selection.createRange();
        } catch (e) {}
        if (!range || range.parentElement() != te) return false;
        return range.compareEndPoints("StartToEnd", range) != 0;
    };
    var hasCopyEvent = function() {
        var e = elt("div");
        if ("oncopy" in e) return true;
        e.setAttribute("oncopy", "return;");
        return typeof e.oncopy == "function";
    }();
    var badZoomedRects = null;
    function hasBadZoomedRects(measure) {
        if (badZoomedRects != null) return badZoomedRects;
        var node = removeChildrenAndAdd(measure, elt("span", "x"));
        var normal = node.getBoundingClientRect();
        var fromRange = range(node, 0, 1).getBoundingClientRect();
        return badZoomedRects = Math.abs(normal.left - fromRange.left) > 1;
    }
    var keyNames = {
        3: "Enter",
        8: "Backspace",
        9: "Tab",
        13: "Enter",
        16: "Shift",
        17: "Ctrl",
        18: "Alt",
        19: "Pause",
        20: "CapsLock",
        27: "Esc",
        32: "Space",
        33: "PageUp",
        34: "PageDown",
        35: "End",
        36: "Home",
        37: "Left",
        38: "Up",
        39: "Right",
        40: "Down",
        44: "PrintScrn",
        45: "Insert",
        46: "Delete",
        59: ";",
        61: "=",
        91: "Mod",
        92: "Mod",
        93: "Mod",
        107: "=",
        109: "-",
        127: "Delete",
        173: "-",
        186: ";",
        187: "=",
        188: ",",
        189: "-",
        190: ".",
        191: "/",
        192: "`",
        219: "[",
        220: "\\",
        221: "]",
        222: "'",
        63232: "Up",
        63233: "Down",
        63234: "Left",
        63235: "Right",
        63272: "Delete",
        63273: "Home",
        63275: "End",
        63276: "PageUp",
        63277: "PageDown",
        63302: "Insert"
    };
    CodeMirror.keyNames = keyNames;
    (function() {
        for (var i = 0; i < 10; i++) keyNames[i + 48] = keyNames[i + 96] = String(i);
        for (var i = 65; i <= 90; i++) keyNames[i] = String.fromCharCode(i);
        for (var i = 1; i <= 12; i++) keyNames[i + 111] = keyNames[i + 63235] = "F" + i;
    })();
    function iterateBidiSections(order, from, to, f) {
        if (!order) return f(from, to, "ltr");
        var found = false;
        for (var i = 0; i < order.length; ++i) {
            var part = order[i];
            if (part.from < to && part.to > from || from == to && part.to == from) {
                f(Math.max(part.from, from), Math.min(part.to, to), part.level == 1 ? "rtl" : "ltr");
                found = true;
            }
        }
        if (!found) f(from, to, "ltr");
    }
    function bidiLeft(part) {
        return part.level % 2 ? part.to : part.from;
    }
    function bidiRight(part) {
        return part.level % 2 ? part.from : part.to;
    }
    function lineLeft(line) {
        var order = getOrder(line);
        return order ? bidiLeft(order[0]) : 0;
    }
    function lineRight(line) {
        var order = getOrder(line);
        if (!order) return line.text.length;
        return bidiRight(lst(order));
    }
    function lineStart(cm, lineN) {
        var line = getLine(cm.doc, lineN);
        var visual = visualLine(line);
        if (visual != line) lineN = lineNo(visual);
        var order = getOrder(visual);
        var ch = !order ? 0 : order[0].level % 2 ? lineRight(visual) : lineLeft(visual);
        return Pos(lineN, ch);
    }
    function lineEnd(cm, lineN) {
        var merged, line = getLine(cm.doc, lineN);
        while (merged = collapsedSpanAtEnd(line)) {
            line = merged.find(1, true).line;
            lineN = null;
        }
        var order = getOrder(line);
        var ch = !order ? line.text.length : order[0].level % 2 ? lineLeft(line) : lineRight(line);
        return Pos(lineN == null ? lineNo(line) : lineN, ch);
    }
    function lineStartSmart(cm, pos) {
        var start = lineStart(cm, pos.line);
        var line = getLine(cm.doc, start.line);
        var order = getOrder(line);
        if (!order || order[0].level == 0) {
            var firstNonWS = Math.max(0, line.text.search(/\S/));
            var inWS = pos.line == start.line && pos.ch <= firstNonWS && pos.ch;
            return Pos(start.line, inWS ? 0 : firstNonWS);
        }
        return start;
    }
    function compareBidiLevel(order, a, b) {
        var linedir = order[0].level;
        if (a == linedir) return true;
        if (b == linedir) return false;
        return a < b;
    }
    var bidiOther;
    function getBidiPartAt(order, pos) {
        bidiOther = null;
        for (var i = 0, found; i < order.length; ++i) {
            var cur = order[i];
            if (cur.from < pos && cur.to > pos) return i;
            if (cur.from == pos || cur.to == pos) {
                if (found == null) {
                    found = i;
                } else if (compareBidiLevel(order, cur.level, order[found].level)) {
                    if (cur.from != cur.to) bidiOther = found;
                    return i;
                } else {
                    if (cur.from != cur.to) bidiOther = i;
                    return found;
                }
            }
        }
        return found;
    }
    function moveInLine(line, pos, dir, byUnit) {
        if (!byUnit) return pos + dir;
        do {
            pos += dir;
        } while (pos > 0 && isExtendingChar(line.text.charAt(pos)));
        return pos;
    }
    function moveVisually(line, start, dir, byUnit) {
        var bidi = getOrder(line);
        if (!bidi) return moveLogically(line, start, dir, byUnit);
        var pos = getBidiPartAt(bidi, start), part = bidi[pos];
        var target = moveInLine(line, start, part.level % 2 ? -dir : dir, byUnit);
        for (;;) {
            if (target > part.from && target < part.to) return target;
            if (target == part.from || target == part.to) {
                if (getBidiPartAt(bidi, target) == pos) return target;
                part = bidi[pos += dir];
                return dir > 0 == part.level % 2 ? part.to : part.from;
            } else {
                part = bidi[pos += dir];
                if (!part) return null;
                if (dir > 0 == part.level % 2) target = moveInLine(line, part.to, -1, byUnit); else target = moveInLine(line, part.from, 1, byUnit);
            }
        }
    }
    function moveLogically(line, start, dir, byUnit) {
        var target = start + dir;
        if (byUnit) while (target > 0 && isExtendingChar(line.text.charAt(target))) target += dir;
        return target < 0 || target > line.text.length ? null : target;
    }
    var bidiOrdering = function() {
        var lowTypes = "bbbbbbbbbtstwsbbbbbbbbbbbbbbssstwNN%%%NNNNNN,N,N1111111111NNNNNNNLLLLLLLLLLLLLLLLLLLLLLLLLLNNNNNNLLLLLLLLLLLLLLLLLLLLLLLLLLNNNNbbbbbbsbbbbbbbbbbbbbbbbbbbbbbbbbb,N%%%%NNNNLNNNNN%%11NLNNN1LNNNNNLLLLLLLLLLLLLLLLLLLLLLLNLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLN";
        var arabicTypes = "rrrrrrrrrrrr,rNNmmmmmmrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrmmmmmmmmmmmmmmrrrrrrrnnnnnnnnnn%nnrrrmrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrmmmmmmmmmmmmmmmmmmmNmmmm";
        function charType(code) {
            if (code <= 247) return lowTypes.charAt(code); else if (1424 <= code && code <= 1524) return "R"; else if (1536 <= code && code <= 1773) return arabicTypes.charAt(code - 1536); else if (1774 <= code && code <= 2220) return "r"; else if (8192 <= code && code <= 8203) return "w"; else if (code == 8204) return "b"; else return "L";
        }
        var bidiRE = /[\u0590-\u05f4\u0600-\u06ff\u0700-\u08ac]/;
        var isNeutral = /[stwN]/, isStrong = /[LRr]/, countsAsLeft = /[Lb1n]/, countsAsNum = /[1n]/;
        var outerType = "L";
        function BidiSpan(level, from, to) {
            this.level = level;
            this.from = from;
            this.to = to;
        }
        return function(str) {
            if (!bidiRE.test(str)) return false;
            var len = str.length, types = [];
            for (var i = 0, type; i < len; ++i) types.push(type = charType(str.charCodeAt(i)));
            for (var i = 0, prev = outerType; i < len; ++i) {
                var type = types[i];
                if (type == "m") types[i] = prev; else prev = type;
            }
            for (var i = 0, cur = outerType; i < len; ++i) {
                var type = types[i];
                if (type == "1" && cur == "r") types[i] = "n"; else if (isStrong.test(type)) {
                    cur = type;
                    if (type == "r") types[i] = "R";
                }
            }
            for (var i = 1, prev = types[0]; i < len - 1; ++i) {
                var type = types[i];
                if (type == "+" && prev == "1" && types[i + 1] == "1") types[i] = "1"; else if (type == "," && prev == types[i + 1] && (prev == "1" || prev == "n")) types[i] = prev;
                prev = type;
            }
            for (var i = 0; i < len; ++i) {
                var type = types[i];
                if (type == ",") types[i] = "N"; else if (type == "%") {
                    for (var end = i + 1; end < len && types[end] == "%"; ++end) {}
                    var replace = i && types[i - 1] == "!" || end < len && types[end] == "1" ? "1" : "N";
                    for (var j = i; j < end; ++j) types[j] = replace;
                    i = end - 1;
                }
            }
            for (var i = 0, cur = outerType; i < len; ++i) {
                var type = types[i];
                if (cur == "L" && type == "1") types[i] = "L"; else if (isStrong.test(type)) cur = type;
            }
            for (var i = 0; i < len; ++i) {
                if (isNeutral.test(types[i])) {
                    for (var end = i + 1; end < len && isNeutral.test(types[end]); ++end) {}
                    var before = (i ? types[i - 1] : outerType) == "L";
                    var after = (end < len ? types[end] : outerType) == "L";
                    var replace = before || after ? "L" : "R";
                    for (var j = i; j < end; ++j) types[j] = replace;
                    i = end - 1;
                }
            }
            var order = [], m;
            for (var i = 0; i < len; ) {
                if (countsAsLeft.test(types[i])) {
                    var start = i;
                    for (++i; i < len && countsAsLeft.test(types[i]); ++i) {}
                    order.push(new BidiSpan(0, start, i));
                } else {
                    var pos = i, at = order.length;
                    for (++i; i < len && types[i] != "L"; ++i) {}
                    for (var j = pos; j < i; ) {
                        if (countsAsNum.test(types[j])) {
                            if (pos < j) order.splice(at, 0, new BidiSpan(1, pos, j));
                            var nstart = j;
                            for (++j; j < i && countsAsNum.test(types[j]); ++j) {}
                            order.splice(at, 0, new BidiSpan(2, nstart, j));
                            pos = j;
                        } else ++j;
                    }
                    if (pos < i) order.splice(at, 0, new BidiSpan(1, pos, i));
                }
            }
            if (order[0].level == 1 && (m = str.match(/^\s+/))) {
                order[0].from = m[0].length;
                order.unshift(new BidiSpan(0, 0, m[0].length));
            }
            if (lst(order).level == 1 && (m = str.match(/\s+$/))) {
                lst(order).to -= m[0].length;
                order.push(new BidiSpan(0, len - m[0].length, len));
            }
            if (order[0].level != lst(order).level) order.push(new BidiSpan(order[0].level, len, len));
            return order;
        };
    }();
    CodeMirror.version = "4.8.0";
    return CodeMirror;
});

(function(mod) {
    if (typeof exports == "object" && typeof module == "object") mod(require("../../lib/codemirror")); else if (typeof define == "function" && define.amd) define([ "../../lib/codemirror" ], mod); else mod(CodeMirror);
})(function(CodeMirror) {
    var ie_lt8 = /MSIE \d/.test(navigator.userAgent) && (document.documentMode == null || document.documentMode < 8);
    var Pos = CodeMirror.Pos;
    var matching = {
        "(": ")>",
        ")": "(<",
        "[": "]>",
        "]": "[<",
        "{": "}>",
        "}": "{<"
    };
    function findMatchingBracket(cm, where, strict, config) {
        var line = cm.getLineHandle(where.line), pos = where.ch - 1;
        var match = pos >= 0 && matching[line.text.charAt(pos)] || matching[line.text.charAt(++pos)];
        if (!match) return null;
        var dir = match.charAt(1) == ">" ? 1 : -1;
        if (strict && dir > 0 != (pos == where.ch)) return null;
        var style = cm.getTokenTypeAt(Pos(where.line, pos + 1));
        var found = scanForBracket(cm, Pos(where.line, pos + (dir > 0 ? 1 : 0)), dir, style || null, config);
        if (found == null) return null;
        return {
            from: Pos(where.line, pos),
            to: found && found.pos,
            match: found && found.ch == match.charAt(0),
            forward: dir > 0
        };
    }
    function scanForBracket(cm, where, dir, style, config) {
        var maxScanLen = config && config.maxScanLineLength || 1e4;
        var maxScanLines = config && config.maxScanLines || 1e3;
        var stack = [];
        var re = config && config.bracketRegex ? config.bracketRegex : /[(){}[\]]/;
        var lineEnd = dir > 0 ? Math.min(where.line + maxScanLines, cm.lastLine() + 1) : Math.max(cm.firstLine() - 1, where.line - maxScanLines);
        for (var lineNo = where.line; lineNo != lineEnd; lineNo += dir) {
            var line = cm.getLine(lineNo);
            if (!line) continue;
            var pos = dir > 0 ? 0 : line.length - 1, end = dir > 0 ? line.length : -1;
            if (line.length > maxScanLen) continue;
            if (lineNo == where.line) pos = where.ch - (dir < 0 ? 1 : 0);
            for (;pos != end; pos += dir) {
                var ch = line.charAt(pos);
                if (re.test(ch) && (style === undefined || cm.getTokenTypeAt(Pos(lineNo, pos + 1)) == style)) {
                    var match = matching[ch];
                    if (match.charAt(1) == ">" == dir > 0) stack.push(ch); else if (!stack.length) return {
                        pos: Pos(lineNo, pos),
                        ch: ch
                    }; else stack.pop();
                }
            }
        }
        return lineNo - dir == (dir > 0 ? cm.lastLine() : cm.firstLine()) ? false : null;
    }
    function matchBrackets(cm, autoclear, config) {
        var maxHighlightLen = cm.state.matchBrackets.maxHighlightLineLength || 1e3;
        var marks = [], ranges = cm.listSelections();
        for (var i = 0; i < ranges.length; i++) {
            var match = ranges[i].empty() && findMatchingBracket(cm, ranges[i].head, false, config);
            if (match && cm.getLine(match.from.line).length <= maxHighlightLen) {
                var style = match.match ? "CodeMirror-matchingbracket" : "CodeMirror-nonmatchingbracket";
                marks.push(cm.markText(match.from, Pos(match.from.line, match.from.ch + 1), {
                    className: style
                }));
                if (match.to && cm.getLine(match.to.line).length <= maxHighlightLen) marks.push(cm.markText(match.to, Pos(match.to.line, match.to.ch + 1), {
                    className: style
                }));
            }
        }
        if (marks.length) {
            if (ie_lt8 && cm.state.focused) cm.display.input.focus();
            var clear = function() {
                cm.operation(function() {
                    for (var i = 0; i < marks.length; i++) marks[i].clear();
                });
            };
            if (autoclear) setTimeout(clear, 800); else return clear;
        }
    }
    var currentlyHighlighted = null;
    function doMatchBrackets(cm) {
        cm.operation(function() {
            if (currentlyHighlighted) {
                currentlyHighlighted();
                currentlyHighlighted = null;
            }
            currentlyHighlighted = matchBrackets(cm, false, cm.state.matchBrackets);
        });
    }
    CodeMirror.defineOption("matchBrackets", false, function(cm, val, old) {
        if (old && old != CodeMirror.Init) cm.off("cursorActivity", doMatchBrackets);
        if (val) {
            cm.state.matchBrackets = typeof val == "object" ? val : {};
            cm.on("cursorActivity", doMatchBrackets);
        }
    });
    CodeMirror.defineExtension("matchBrackets", function() {
        matchBrackets(this, true);
    });
    CodeMirror.defineExtension("findMatchingBracket", function(pos, strict, config) {
        return findMatchingBracket(this, pos, strict, config);
    });
    CodeMirror.defineExtension("scanForBracket", function(pos, dir, style, config) {
        return scanForBracket(this, pos, dir, style, config);
    });
});

(function(mod) {
    if (typeof exports == "object" && typeof module == "object") mod(require("../../lib/codemirror")); else if (typeof define == "function" && define.amd) define([ "../../lib/codemirror" ], mod); else mod(CodeMirror);
})(function(CodeMirror) {
    "use strict";
    function doFold(cm, pos, options, force) {
        if (options && options.call) {
            var finder = options;
            options = null;
        } else {
            var finder = getOption(cm, options, "rangeFinder");
        }
        if (typeof pos == "number") pos = CodeMirror.Pos(pos, 0);
        var minSize = getOption(cm, options, "minFoldSize");
        function getRange(allowFolded) {
            var range = finder(cm, pos);
            if (!range || range.to.line - range.from.line < minSize) return null;
            var marks = cm.findMarksAt(range.from);
            for (var i = 0; i < marks.length; ++i) {
                if (marks[i].__isFold && force !== "fold") {
                    if (!allowFolded) return null;
                    range.cleared = true;
                    marks[i].clear();
                }
            }
            return range;
        }
        var range = getRange(true);
        if (getOption(cm, options, "scanUp")) while (!range && pos.line > cm.firstLine()) {
            pos = CodeMirror.Pos(pos.line - 1, 0);
            range = getRange(false);
        }
        if (!range || range.cleared || force === "unfold") return;
        var myWidget = makeWidget(cm, options);
        CodeMirror.on(myWidget, "mousedown", function(e) {
            myRange.clear();
            CodeMirror.e_preventDefault(e);
        });
        var myRange = cm.markText(range.from, range.to, {
            replacedWith: myWidget,
            clearOnEnter: true,
            __isFold: true
        });
        myRange.on("clear", function(from, to) {
            CodeMirror.signal(cm, "unfold", cm, from, to);
        });
        CodeMirror.signal(cm, "fold", cm, range.from, range.to);
    }
    function makeWidget(cm, options) {
        var widget = getOption(cm, options, "widget");
        if (typeof widget == "string") {
            var text = document.createTextNode(widget);
            widget = document.createElement("span");
            widget.appendChild(text);
            widget.className = "CodeMirror-foldmarker";
        }
        return widget;
    }
    CodeMirror.newFoldFunction = function(rangeFinder, widget) {
        return function(cm, pos) {
            doFold(cm, pos, {
                rangeFinder: rangeFinder,
                widget: widget
            });
        };
    };
    CodeMirror.defineExtension("foldCode", function(pos, options, force) {
        doFold(this, pos, options, force);
    });
    CodeMirror.defineExtension("isFolded", function(pos) {
        var marks = this.findMarksAt(pos);
        for (var i = 0; i < marks.length; ++i) if (marks[i].__isFold) return true;
    });
    CodeMirror.commands.toggleFold = function(cm) {
        cm.foldCode(cm.getCursor());
    };
    CodeMirror.commands.fold = function(cm) {
        cm.foldCode(cm.getCursor(), null, "fold");
    };
    CodeMirror.commands.unfold = function(cm) {
        cm.foldCode(cm.getCursor(), null, "unfold");
    };
    CodeMirror.commands.foldAll = function(cm) {
        cm.operation(function() {
            for (var i = cm.firstLine(), e = cm.lastLine(); i <= e; i++) cm.foldCode(CodeMirror.Pos(i, 0), null, "fold");
        });
    };
    CodeMirror.commands.unfoldAll = function(cm) {
        cm.operation(function() {
            for (var i = cm.firstLine(), e = cm.lastLine(); i <= e; i++) cm.foldCode(CodeMirror.Pos(i, 0), null, "unfold");
        });
    };
    CodeMirror.registerHelper("fold", "combine", function() {
        var funcs = Array.prototype.slice.call(arguments, 0);
        return function(cm, start) {
            for (var i = 0; i < funcs.length; ++i) {
                var found = funcs[i](cm, start);
                if (found) return found;
            }
        };
    });
    CodeMirror.registerHelper("fold", "auto", function(cm, start) {
        var helpers = cm.getHelpers(start, "fold");
        for (var i = 0; i < helpers.length; i++) {
            var cur = helpers[i](cm, start);
            if (cur) return cur;
        }
    });
    var defaultOptions = {
        rangeFinder: CodeMirror.fold.auto,
        widget: "↔",
        minFoldSize: 0,
        scanUp: false
    };
    CodeMirror.defineOption("foldOptions", null);
    function getOption(cm, options, name) {
        if (options && options[name] !== undefined) return options[name];
        var editorOptions = cm.options.foldOptions;
        if (editorOptions && editorOptions[name] !== undefined) return editorOptions[name];
        return defaultOptions[name];
    }
});

(function(mod) {
    if (typeof exports == "object" && typeof module == "object") mod(require("../../lib/codemirror"), require("./foldcode")); else if (typeof define == "function" && define.amd) define([ "../../lib/codemirror", "./foldcode" ], mod); else mod(CodeMirror);
})(function(CodeMirror) {
    "use strict";
    CodeMirror.defineOption("foldGutter", false, function(cm, val, old) {
        if (old && old != CodeMirror.Init) {
            cm.clearGutter(cm.state.foldGutter.options.gutter);
            cm.state.foldGutter = null;
            cm.off("gutterClick", onGutterClick);
            cm.off("change", onChange);
            cm.off("viewportChange", onViewportChange);
            cm.off("fold", onFold);
            cm.off("unfold", onFold);
            cm.off("swapDoc", updateInViewport);
        }
        if (val) {
            cm.state.foldGutter = new State(parseOptions(val));
            updateInViewport(cm);
            cm.on("gutterClick", onGutterClick);
            cm.on("change", onChange);
            cm.on("viewportChange", onViewportChange);
            cm.on("fold", onFold);
            cm.on("unfold", onFold);
            cm.on("swapDoc", updateInViewport);
        }
    });
    var Pos = CodeMirror.Pos;
    function State(options) {
        this.options = options;
        this.from = this.to = 0;
    }
    function parseOptions(opts) {
        if (opts === true) opts = {};
        if (opts.gutter == null) opts.gutter = "CodeMirror-foldgutter";
        if (opts.indicatorOpen == null) opts.indicatorOpen = "CodeMirror-foldgutter-open";
        if (opts.indicatorFolded == null) opts.indicatorFolded = "CodeMirror-foldgutter-folded";
        return opts;
    }
    function isFolded(cm, line) {
        var marks = cm.findMarksAt(Pos(line));
        for (var i = 0; i < marks.length; ++i) if (marks[i].__isFold && marks[i].find().from.line == line) return true;
    }
    function marker(spec) {
        if (typeof spec == "string") {
            var elt = document.createElement("div");
            elt.className = spec + " CodeMirror-guttermarker-subtle";
            return elt;
        } else {
            return spec.cloneNode(true);
        }
    }
    function updateFoldInfo(cm, from, to) {
        var opts = cm.state.foldGutter.options, cur = from;
        cm.eachLine(from, to, function(line) {
            var mark = null;
            if (isFolded(cm, cur)) {
                mark = marker(opts.indicatorFolded);
            } else {
                var pos = Pos(cur, 0), func = opts.rangeFinder || CodeMirror.fold.auto;
                var range = func && func(cm, pos);
                if (range && range.from.line + 1 < range.to.line) mark = marker(opts.indicatorOpen);
            }
            cm.setGutterMarker(line, opts.gutter, mark);
            ++cur;
        });
    }
    function updateInViewport(cm) {
        var vp = cm.getViewport(), state = cm.state.foldGutter;
        if (!state) return;
        cm.operation(function() {
            updateFoldInfo(cm, vp.from, vp.to);
        });
        state.from = vp.from;
        state.to = vp.to;
    }
    function onGutterClick(cm, line, gutter) {
        var opts = cm.state.foldGutter.options;
        if (gutter != opts.gutter) return;
        cm.foldCode(Pos(line, 0), opts.rangeFinder);
    }
    function onChange(cm) {
        var state = cm.state.foldGutter, opts = cm.state.foldGutter.options;
        state.from = state.to = 0;
        clearTimeout(state.changeUpdate);
        state.changeUpdate = setTimeout(function() {
            updateInViewport(cm);
        }, opts.foldOnChangeTimeSpan || 600);
    }
    function onViewportChange(cm) {
        var state = cm.state.foldGutter, opts = cm.state.foldGutter.options;
        clearTimeout(state.changeUpdate);
        state.changeUpdate = setTimeout(function() {
            var vp = cm.getViewport();
            if (state.from == state.to || vp.from - state.to > 20 || state.from - vp.to > 20) {
                updateInViewport(cm);
            } else {
                cm.operation(function() {
                    if (vp.from < state.from) {
                        updateFoldInfo(cm, vp.from, state.from);
                        state.from = vp.from;
                    }
                    if (vp.to > state.to) {
                        updateFoldInfo(cm, state.to, vp.to);
                        state.to = vp.to;
                    }
                });
            }
        }, opts.updateViewportTimeSpan || 400);
    }
    function onFold(cm, from) {
        var state = cm.state.foldGutter, line = from.line;
        if (line >= state.from && line < state.to) updateFoldInfo(cm, line, line + 1);
    }
});

(function(mod) {
    if (typeof exports == "object" && typeof module == "object") mod(require("../../lib/codemirror")); else if (typeof define == "function" && define.amd) define([ "../../lib/codemirror" ], mod); else mod(CodeMirror);
})(function(CodeMirror) {
    "use strict";
    CodeMirror.registerHelper("fold", "brace", function(cm, start) {
        var line = start.line, lineText = cm.getLine(line);
        var startCh, tokenType;
        function findOpening(openCh) {
            for (var at = start.ch, pass = 0; ;) {
                var found = at <= 0 ? -1 : lineText.lastIndexOf(openCh, at - 1);
                if (found == -1) {
                    if (pass == 1) break;
                    pass = 1;
                    at = lineText.length;
                    continue;
                }
                if (pass == 1 && found < start.ch) break;
                tokenType = cm.getTokenTypeAt(CodeMirror.Pos(line, found + 1));
                if (!/^(comment|string)/.test(tokenType)) return found + 1;
                at = found - 1;
            }
        }
        var startToken = "{", endToken = "}", startCh = findOpening("{");
        if (startCh == null) {
            startToken = "[", endToken = "]";
            startCh = findOpening("[");
        }
        if (startCh == null) return;
        var count = 1, lastLine = cm.lastLine(), end, endCh;
        outer: for (var i = line; i <= lastLine; ++i) {
            var text = cm.getLine(i), pos = i == line ? startCh : 0;
            for (;;) {
                var nextOpen = text.indexOf(startToken, pos), nextClose = text.indexOf(endToken, pos);
                if (nextOpen < 0) nextOpen = text.length;
                if (nextClose < 0) nextClose = text.length;
                pos = Math.min(nextOpen, nextClose);
                if (pos == text.length) break;
                if (cm.getTokenTypeAt(CodeMirror.Pos(i, pos + 1)) == tokenType) {
                    if (pos == nextOpen) ++count; else if (!--count) {
                        end = i;
                        endCh = pos;
                        break outer;
                    }
                }
                ++pos;
            }
        }
        if (end == null || line == end && endCh == startCh) return;
        return {
            from: CodeMirror.Pos(line, startCh),
            to: CodeMirror.Pos(end, endCh)
        };
    });
    CodeMirror.registerHelper("fold", "import", function(cm, start) {
        function hasImport(line) {
            if (line < cm.firstLine() || line > cm.lastLine()) return null;
            var start = cm.getTokenAt(CodeMirror.Pos(line, 1));
            if (!/\S/.test(start.string)) start = cm.getTokenAt(CodeMirror.Pos(line, start.end + 1));
            if (start.type != "keyword" || start.string != "import") return null;
            for (var i = line, e = Math.min(cm.lastLine(), line + 10); i <= e; ++i) {
                var text = cm.getLine(i), semi = text.indexOf(";");
                if (semi != -1) return {
                    startCh: start.end,
                    end: CodeMirror.Pos(i, semi)
                };
            }
        }
        var start = start.line, has = hasImport(start), prev;
        if (!has || hasImport(start - 1) || (prev = hasImport(start - 2)) && prev.end.line == start - 1) return null;
        for (var end = has.end; ;) {
            var next = hasImport(end.line + 1);
            if (next == null) break;
            end = next.end;
        }
        return {
            from: cm.clipPos(CodeMirror.Pos(start, has.startCh + 1)),
            to: end
        };
    });
    CodeMirror.registerHelper("fold", "include", function(cm, start) {
        function hasInclude(line) {
            if (line < cm.firstLine() || line > cm.lastLine()) return null;
            var start = cm.getTokenAt(CodeMirror.Pos(line, 1));
            if (!/\S/.test(start.string)) start = cm.getTokenAt(CodeMirror.Pos(line, start.end + 1));
            if (start.type == "meta" && start.string.slice(0, 8) == "#include") return start.start + 8;
        }
        var start = start.line, has = hasInclude(start);
        if (has == null || hasInclude(start - 1) != null) return null;
        for (var end = start; ;) {
            var next = hasInclude(end + 1);
            if (next == null) break;
            ++end;
        }
        return {
            from: CodeMirror.Pos(start, has + 1),
            to: cm.clipPos(CodeMirror.Pos(end))
        };
    });
});

(function(factory) {
    "use strict";
    if (typeof define === "function" && define.amd) {
        define([ "jquery" ], factory);
    } else if (typeof exports == "object" && typeof module == "object") {
        module.exports = factory;
    } else {
        factory(jQuery);
    }
})(function($, undefined) {
    "use strict";
    var defaultOpts = {
        beforeShow: noop,
        move: noop,
        change: noop,
        show: noop,
        hide: noop,
        color: false,
        flat: false,
        showInput: false,
        allowEmpty: false,
        showButtons: true,
        clickoutFiresChange: true,
        showInitial: false,
        showPalette: false,
        showPaletteOnly: false,
        hideAfterPaletteSelect: false,
        togglePaletteOnly: false,
        showSelectionPalette: true,
        localStorageKey: false,
        appendTo: "body",
        maxSelectionSize: 7,
        cancelText: "cancel",
        chooseText: "choose",
        togglePaletteMoreText: "more",
        togglePaletteLessText: "less",
        clearText: "Clear Color Selection",
        noColorSelectedText: "No Color Selected",
        preferredFormat: false,
        className: "",
        containerClassName: "",
        replacerClassName: "",
        showAlpha: false,
        theme: "sp-light",
        palette: [ [ "#ffffff", "#000000", "#ff0000", "#ff8000", "#ffff00", "#008000", "#0000ff", "#4b0082", "#9400d3" ] ],
        selectionPalette: [],
        disabled: false,
        offset: null
    }, spectrums = [], IE = !!/msie/i.exec(window.navigator.userAgent), rgbaSupport = function() {
        function contains(str, substr) {
            return !!~("" + str).indexOf(substr);
        }
        var elem = document.createElement("div");
        var style = elem.style;
        style.cssText = "background-color:rgba(0,0,0,.5)";
        return contains(style.backgroundColor, "rgba") || contains(style.backgroundColor, "hsla");
    }(), replaceInput = [ "<div class='sp-replacer'>", "<div class='sp-preview'><div class='sp-preview-inner'></div></div>", "<div class='sp-dd'>&#9660;</div>", "</div>" ].join(""), markup = function() {
        var gradientFix = "";
        if (IE) {
            for (var i = 1; i <= 6; i++) {
                gradientFix += "<div class='sp-" + i + "'></div>";
            }
        }
        return [ "<div class='sp-container sp-hidden'>", "<div class='sp-palette-container'>", "<div class='sp-palette sp-thumb sp-cf'></div>", "<div class='sp-palette-button-container sp-cf'>", "<button type='button' class='sp-palette-toggle'></button>", "</div>", "</div>", "<div class='sp-picker-container'>", "<div class='sp-top sp-cf'>", "<div class='sp-fill'></div>", "<div class='sp-top-inner'>", "<div class='sp-color'>", "<div class='sp-sat'>", "<div class='sp-val'>", "<div class='sp-dragger'></div>", "</div>", "</div>", "</div>", "<div class='sp-clear sp-clear-display'>", "</div>", "<div class='sp-hue'>", "<div class='sp-slider'></div>", gradientFix, "</div>", "</div>", "<div class='sp-alpha'><div class='sp-alpha-inner'><div class='sp-alpha-handle'></div></div></div>", "</div>", "<div class='sp-input-container sp-cf'>", "<input class='sp-input' type='text' spellcheck='false'  />", "</div>", "<div class='sp-initial sp-thumb sp-cf'></div>", "<div class='sp-button-container sp-cf'>", "<a class='sp-cancel' href='#'></a>", "<button type='button' class='sp-choose'></button>", "</div>", "</div>", "</div>" ].join("");
    }();
    function paletteTemplate(p, color, className, opts) {
        var html = [];
        for (var i = 0; i < p.length; i++) {
            var current = p[i];
            if (current) {
                var tiny = tinycolor(current);
                var c = tiny.toHsl().l < .5 ? "sp-thumb-el sp-thumb-dark" : "sp-thumb-el sp-thumb-light";
                c += tinycolor.equals(color, current) ? " sp-thumb-active" : "";
                var formattedString = tiny.toString(opts.preferredFormat || "rgb");
                var swatchStyle = rgbaSupport ? "background-color:" + tiny.toRgbString() : "filter:" + tiny.toFilter();
                html.push('<span title="' + formattedString + '" data-color="' + tiny.toRgbString() + '" class="' + c + '"><span class="sp-thumb-inner" style="' + swatchStyle + ';" /></span>');
            } else {
                var cls = "sp-clear-display";
                html.push($("<div />").append($('<span data-color="" style="background-color:transparent;" class="' + cls + '"></span>').attr("title", opts.noColorSelectedText)).html());
            }
        }
        return "<div class='sp-cf " + className + "'>" + html.join("") + "</div>";
    }
    function hideAll() {
        for (var i = 0; i < spectrums.length; i++) {
            if (spectrums[i]) {
                spectrums[i].hide();
            }
        }
    }
    function instanceOptions(o, callbackContext) {
        var opts = $.extend({}, defaultOpts, o);
        opts.callbacks = {
            move: bind(opts.move, callbackContext),
            change: bind(opts.change, callbackContext),
            show: bind(opts.show, callbackContext),
            hide: bind(opts.hide, callbackContext),
            beforeShow: bind(opts.beforeShow, callbackContext)
        };
        return opts;
    }
    function spectrum(element, o) {
        var opts = instanceOptions(o, element), flat = opts.flat, showSelectionPalette = opts.showSelectionPalette, localStorageKey = opts.localStorageKey, theme = opts.theme, callbacks = opts.callbacks, resize = throttle(reflow, 10), visible = false, isDragging = false, dragWidth = 0, dragHeight = 0, dragHelperHeight = 0, slideHeight = 0, slideWidth = 0, alphaWidth = 0, alphaSlideHelperWidth = 0, slideHelperHeight = 0, currentHue = 0, currentSaturation = 0, currentValue = 0, currentAlpha = 1, palette = [], paletteArray = [], paletteLookup = {}, selectionPalette = opts.selectionPalette.slice(0), maxSelectionSize = opts.maxSelectionSize, draggingClass = "sp-dragging", shiftMovementDirection = null;
        var doc = element.ownerDocument, body = doc.body, boundElement = $(element), disabled = false, container = $(markup, doc).addClass(theme), pickerContainer = container.find(".sp-picker-container"), dragger = container.find(".sp-color"), dragHelper = container.find(".sp-dragger"), slider = container.find(".sp-hue"), slideHelper = container.find(".sp-slider"), alphaSliderInner = container.find(".sp-alpha-inner"), alphaSlider = container.find(".sp-alpha"), alphaSlideHelper = container.find(".sp-alpha-handle"), textInput = container.find(".sp-input"), paletteContainer = container.find(".sp-palette"), initialColorContainer = container.find(".sp-initial"), cancelButton = container.find(".sp-cancel"), clearButton = container.find(".sp-clear"), chooseButton = container.find(".sp-choose"), toggleButton = container.find(".sp-palette-toggle"), isInput = boundElement.is("input"), isInputTypeColor = isInput && boundElement.attr("type") === "color" && inputTypeColorSupport(), shouldReplace = isInput && !flat, replacer = shouldReplace ? $(replaceInput).addClass(theme).addClass(opts.className).addClass(opts.replacerClassName) : $([]), offsetElement = shouldReplace ? replacer : boundElement, previewElement = replacer.find(".sp-preview-inner"), initialColor = opts.color || isInput && boundElement.val(), colorOnShow = false, preferredFormat = opts.preferredFormat, currentPreferredFormat = preferredFormat, clickoutFiresChange = !opts.showButtons || opts.clickoutFiresChange, isEmpty = !initialColor, allowEmpty = opts.allowEmpty && !isInputTypeColor;
        function applyOptions() {
            if (opts.showPaletteOnly) {
                opts.showPalette = true;
            }
            toggleButton.text(opts.showPaletteOnly ? opts.togglePaletteMoreText : opts.togglePaletteLessText);
            if (opts.palette) {
                palette = opts.palette.slice(0);
                paletteArray = $.isArray(palette[0]) ? palette : [ palette ];
                paletteLookup = {};
                for (var i = 0; i < paletteArray.length; i++) {
                    for (var j = 0; j < paletteArray[i].length; j++) {
                        var rgb = tinycolor(paletteArray[i][j]).toRgbString();
                        paletteLookup[rgb] = true;
                    }
                }
            }
            container.toggleClass("sp-flat", flat);
            container.toggleClass("sp-input-disabled", !opts.showInput);
            container.toggleClass("sp-alpha-enabled", opts.showAlpha);
            container.toggleClass("sp-clear-enabled", allowEmpty);
            container.toggleClass("sp-buttons-disabled", !opts.showButtons);
            container.toggleClass("sp-palette-buttons-disabled", !opts.togglePaletteOnly);
            container.toggleClass("sp-palette-disabled", !opts.showPalette);
            container.toggleClass("sp-palette-only", opts.showPaletteOnly);
            container.toggleClass("sp-initial-disabled", !opts.showInitial);
            container.addClass(opts.className).addClass(opts.containerClassName);
            reflow();
        }
        function initialize() {
            if (IE) {
                container.find("*:not(input)").attr("unselectable", "on");
            }
            applyOptions();
            if (shouldReplace) {
                boundElement.after(replacer).hide();
            }
            if (!allowEmpty) {
                clearButton.hide();
            }
            if (flat) {
                boundElement.after(container).hide();
            } else {
                var appendTo = opts.appendTo === "parent" ? boundElement.parent() : $(opts.appendTo);
                if (appendTo.length !== 1) {
                    appendTo = $("body");
                }
                appendTo.append(container);
            }
            updateSelectionPaletteFromStorage();
            offsetElement.bind("click.spectrum touchstart.spectrum", function(e) {
                if (!disabled) {
                    toggle();
                }
                e.stopPropagation();
                if (!$(e.target).is("input")) {
                    e.preventDefault();
                }
            });
            if (boundElement.is(":disabled") || opts.disabled === true) {
                disable();
            }
            container.click(stopPropagation);
            textInput.change(setFromTextInput);
            textInput.bind("paste", function() {
                setTimeout(setFromTextInput, 1);
            });
            textInput.keydown(function(e) {
                if (e.keyCode == 13) {
                    setFromTextInput();
                }
            });
            cancelButton.text(opts.cancelText);
            cancelButton.bind("click.spectrum", function(e) {
                e.stopPropagation();
                e.preventDefault();
                revert();
                hide();
            });
            clearButton.attr("title", opts.clearText);
            clearButton.bind("click.spectrum", function(e) {
                e.stopPropagation();
                e.preventDefault();
                isEmpty = true;
                move();
                if (flat) {
                    updateOriginalInput(true);
                }
            });
            chooseButton.text(opts.chooseText);
            chooseButton.bind("click.spectrum", function(e) {
                e.stopPropagation();
                e.preventDefault();
                if (IE && textInput.is(":focus")) {
                    textInput.trigger("change");
                }
                if (isValid()) {
                    updateOriginalInput(true);
                    hide();
                }
            });
            toggleButton.text(opts.showPaletteOnly ? opts.togglePaletteMoreText : opts.togglePaletteLessText);
            toggleButton.bind("click.spectrum", function(e) {
                e.stopPropagation();
                e.preventDefault();
                opts.showPaletteOnly = !opts.showPaletteOnly;
                if (!opts.showPaletteOnly && !flat) {
                    container.css("left", "-=" + (pickerContainer.outerWidth(true) + 5));
                }
                applyOptions();
            });
            draggable(alphaSlider, function(dragX, dragY, e) {
                currentAlpha = dragX / alphaWidth;
                isEmpty = false;
                if (e.shiftKey) {
                    currentAlpha = Math.round(currentAlpha * 10) / 10;
                }
                move();
            }, dragStart, dragStop);
            draggable(slider, function(dragX, dragY) {
                currentHue = parseFloat(dragY / slideHeight);
                isEmpty = false;
                if (!opts.showAlpha) {
                    currentAlpha = 1;
                }
                move();
            }, dragStart, dragStop);
            draggable(dragger, function(dragX, dragY, e) {
                if (!e.shiftKey) {
                    shiftMovementDirection = null;
                } else if (!shiftMovementDirection) {
                    var oldDragX = currentSaturation * dragWidth;
                    var oldDragY = dragHeight - currentValue * dragHeight;
                    var furtherFromX = Math.abs(dragX - oldDragX) > Math.abs(dragY - oldDragY);
                    shiftMovementDirection = furtherFromX ? "x" : "y";
                }
                var setSaturation = !shiftMovementDirection || shiftMovementDirection === "x";
                var setValue = !shiftMovementDirection || shiftMovementDirection === "y";
                if (setSaturation) {
                    currentSaturation = parseFloat(dragX / dragWidth);
                }
                if (setValue) {
                    currentValue = parseFloat((dragHeight - dragY) / dragHeight);
                }
                isEmpty = false;
                if (!opts.showAlpha) {
                    currentAlpha = 1;
                }
                move();
            }, dragStart, dragStop);
            if (!!initialColor) {
                set(initialColor);
                updateUI();
                currentPreferredFormat = preferredFormat || tinycolor(initialColor).format;
                addColorToSelectionPalette(initialColor);
            } else {
                updateUI();
            }
            if (flat) {
                show();
            }
            function paletteElementClick(e) {
                if (e.data && e.data.ignore) {
                    set($(e.target).closest(".sp-thumb-el").data("color"));
                    move();
                } else {
                    set($(e.target).closest(".sp-thumb-el").data("color"));
                    move();
                    updateOriginalInput(true);
                    if (opts.hideAfterPaletteSelect) {
                        hide();
                    }
                }
                return false;
            }
            var paletteEvent = IE ? "mousedown.spectrum" : "click.spectrum touchstart.spectrum";
            paletteContainer.delegate(".sp-thumb-el", paletteEvent, paletteElementClick);
            initialColorContainer.delegate(".sp-thumb-el:nth-child(1)", paletteEvent, {
                ignore: true
            }, paletteElementClick);
        }
        function updateSelectionPaletteFromStorage() {
            if (localStorageKey && window.localStorage) {
                try {
                    var oldPalette = window.localStorage[localStorageKey].split(",#");
                    if (oldPalette.length > 1) {
                        delete window.localStorage[localStorageKey];
                        $.each(oldPalette, function(i, c) {
                            addColorToSelectionPalette(c);
                        });
                    }
                } catch (e) {}
                try {
                    selectionPalette = window.localStorage[localStorageKey].split(";");
                } catch (e) {}
            }
        }
        function addColorToSelectionPalette(color) {
            if (showSelectionPalette) {
                var rgb = tinycolor(color).toRgbString();
                if (!paletteLookup[rgb] && $.inArray(rgb, selectionPalette) === -1) {
                    selectionPalette.push(rgb);
                    while (selectionPalette.length > maxSelectionSize) {
                        selectionPalette.shift();
                    }
                }
                if (localStorageKey && window.localStorage) {
                    try {
                        window.localStorage[localStorageKey] = selectionPalette.join(";");
                    } catch (e) {}
                }
            }
        }
        function getUniqueSelectionPalette() {
            var unique = [];
            if (opts.showPalette) {
                for (var i = 0; i < selectionPalette.length; i++) {
                    var rgb = tinycolor(selectionPalette[i]).toRgbString();
                    if (!paletteLookup[rgb]) {
                        unique.push(selectionPalette[i]);
                    }
                }
            }
            return unique.reverse().slice(0, opts.maxSelectionSize);
        }
        function drawPalette() {
            var currentColor = get();
            var html = $.map(paletteArray, function(palette, i) {
                return paletteTemplate(palette, currentColor, "sp-palette-row sp-palette-row-" + i, opts);
            });
            updateSelectionPaletteFromStorage();
            if (selectionPalette) {
                html.push(paletteTemplate(getUniqueSelectionPalette(), currentColor, "sp-palette-row sp-palette-row-selection", opts));
            }
            paletteContainer.html(html.join(""));
        }
        function drawInitial() {
            if (opts.showInitial) {
                var initial = colorOnShow;
                var current = get();
                initialColorContainer.html(paletteTemplate([ initial, current ], current, "sp-palette-row-initial", opts));
            }
        }
        function dragStart() {
            if (dragHeight <= 0 || dragWidth <= 0 || slideHeight <= 0) {
                reflow();
            }
            isDragging = true;
            container.addClass(draggingClass);
            shiftMovementDirection = null;
            boundElement.trigger("dragstart.spectrum", [ get() ]);
        }
        function dragStop() {
            isDragging = false;
            container.removeClass(draggingClass);
            boundElement.trigger("dragstop.spectrum", [ get() ]);
        }
        function setFromTextInput() {
            var value = textInput.val();
            if ((value === null || value === "") && allowEmpty) {
                set(null);
                updateOriginalInput(true);
            } else {
                var tiny = tinycolor(value);
                if (tiny.isValid()) {
                    set(tiny);
                    updateOriginalInput(true);
                } else {
                    textInput.addClass("sp-validation-error");
                }
            }
        }
        function toggle() {
            if (visible) {
                hide();
            } else {
                show();
            }
        }
        function show() {
            var event = $.Event("beforeShow.spectrum");
            if (visible) {
                reflow();
                return;
            }
            boundElement.trigger(event, [ get() ]);
            if (callbacks.beforeShow(get()) === false || event.isDefaultPrevented()) {
                return;
            }
            hideAll();
            visible = true;
            $(doc).bind("keydown.spectrum", onkeydown);
            $(doc).bind("click.spectrum", clickout);
            $(window).bind("resize.spectrum", resize);
            replacer.addClass("sp-active");
            container.removeClass("sp-hidden");
            reflow();
            updateUI();
            colorOnShow = get();
            drawInitial();
            callbacks.show(colorOnShow);
            boundElement.trigger("show.spectrum", [ colorOnShow ]);
        }
        function onkeydown(e) {
            if (e.keyCode === 27) {
                hide();
            }
        }
        function clickout(e) {
            if (e.button == 2) {
                return;
            }
            if (isDragging) {
                return;
            }
            if (clickoutFiresChange) {
                updateOriginalInput(true);
            } else {
                revert();
            }
            hide();
        }
        function hide() {
            if (!visible || flat) {
                return;
            }
            visible = false;
            $(doc).unbind("keydown.spectrum", onkeydown);
            $(doc).unbind("click.spectrum", clickout);
            $(window).unbind("resize.spectrum", resize);
            replacer.removeClass("sp-active");
            container.addClass("sp-hidden");
            callbacks.hide(get());
            boundElement.trigger("hide.spectrum", [ get() ]);
        }
        function revert() {
            set(colorOnShow, true);
        }
        function set(color, ignoreFormatChange) {
            if (tinycolor.equals(color, get())) {
                updateUI();
                return;
            }
            var newColor, newHsv;
            if (!color && allowEmpty) {
                isEmpty = true;
            } else {
                isEmpty = false;
                newColor = tinycolor(color);
                newHsv = newColor.toHsv();
                currentHue = newHsv.h % 360 / 360;
                currentSaturation = newHsv.s;
                currentValue = newHsv.v;
                currentAlpha = newHsv.a;
            }
            updateUI();
            if (newColor && newColor.isValid() && !ignoreFormatChange) {
                currentPreferredFormat = preferredFormat || newColor.getFormat();
            }
        }
        function get(opts) {
            opts = opts || {};
            if (allowEmpty && isEmpty) {
                return null;
            }
            return tinycolor.fromRatio({
                h: currentHue,
                s: currentSaturation,
                v: currentValue,
                a: Math.round(currentAlpha * 100) / 100
            }, {
                format: opts.format || currentPreferredFormat
            });
        }
        function isValid() {
            return !textInput.hasClass("sp-validation-error");
        }
        function move() {
            updateUI();
            callbacks.move(get());
            boundElement.trigger("move.spectrum", [ get() ]);
        }
        function updateUI() {
            textInput.removeClass("sp-validation-error");
            updateHelperLocations();
            var flatColor = tinycolor.fromRatio({
                h: currentHue,
                s: 1,
                v: 1
            });
            dragger.css("background-color", flatColor.toHexString());
            var format = currentPreferredFormat;
            if (currentAlpha < 1 && !(currentAlpha === 0 && format === "name")) {
                if (format === "hex" || format === "hex3" || format === "hex6" || format === "name") {
                    format = "rgb";
                }
            }
            var realColor = get({
                format: format
            }), displayColor = "";
            previewElement.removeClass("sp-clear-display");
            previewElement.css("background-color", "transparent");
            if (!realColor && allowEmpty) {
                previewElement.addClass("sp-clear-display");
            } else {
                var realHex = realColor.toHexString(), realRgb = realColor.toRgbString();
                if (rgbaSupport || realColor.alpha === 1) {
                    previewElement.css("background-color", realRgb);
                } else {
                    previewElement.css("background-color", "transparent");
                    previewElement.css("filter", realColor.toFilter());
                }
                if (opts.showAlpha) {
                    var rgb = realColor.toRgb();
                    rgb.a = 0;
                    var realAlpha = tinycolor(rgb).toRgbString();
                    var gradient = "linear-gradient(left, " + realAlpha + ", " + realHex + ")";
                    if (IE) {
                        alphaSliderInner.css("filter", tinycolor(realAlpha).toFilter({
                            gradientType: 1
                        }, realHex));
                    } else {
                        alphaSliderInner.css("background", "-webkit-" + gradient);
                        alphaSliderInner.css("background", "-moz-" + gradient);
                        alphaSliderInner.css("background", "-ms-" + gradient);
                        alphaSliderInner.css("background", "linear-gradient(to right, " + realAlpha + ", " + realHex + ")");
                    }
                }
                displayColor = realColor.toString(format);
            }
            if (opts.showInput) {
                textInput.val(displayColor);
            }
            if (opts.showPalette) {
                drawPalette();
            }
            drawInitial();
        }
        function updateHelperLocations() {
            var s = currentSaturation;
            var v = currentValue;
            if (allowEmpty && isEmpty) {
                alphaSlideHelper.hide();
                slideHelper.hide();
                dragHelper.hide();
            } else {
                alphaSlideHelper.show();
                slideHelper.show();
                dragHelper.show();
                var dragX = s * dragWidth;
                var dragY = dragHeight - v * dragHeight;
                dragX = Math.max(-dragHelperHeight, Math.min(dragWidth - dragHelperHeight, dragX - dragHelperHeight));
                dragY = Math.max(-dragHelperHeight, Math.min(dragHeight - dragHelperHeight, dragY - dragHelperHeight));
                dragHelper.css({
                    top: dragY + "px",
                    left: dragX + "px"
                });
                var alphaX = currentAlpha * alphaWidth;
                alphaSlideHelper.css({
                    left: alphaX - alphaSlideHelperWidth / 2 + "px"
                });
                var slideY = currentHue * slideHeight;
                slideHelper.css({
                    top: slideY - slideHelperHeight + "px"
                });
            }
        }
        function updateOriginalInput(fireCallback) {
            var color = get(), displayColor = "", hasChanged = !tinycolor.equals(color, colorOnShow);
            if (color) {
                displayColor = color.toString(currentPreferredFormat);
                addColorToSelectionPalette(color);
            }
            if (isInput) {
                boundElement.val(displayColor);
            }
            if (fireCallback && hasChanged) {
                callbacks.change(color);
                boundElement.trigger("change", [ color ]);
            }
        }
        function reflow() {
            dragWidth = dragger.width();
            dragHeight = dragger.height();
            dragHelperHeight = dragHelper.height();
            slideWidth = slider.width();
            slideHeight = slider.height();
            slideHelperHeight = slideHelper.height();
            alphaWidth = alphaSlider.width();
            alphaSlideHelperWidth = alphaSlideHelper.width();
            if (!flat) {
                container.css("position", "absolute");
                if (opts.offset) {
                    container.offset(opts.offset);
                } else {
                    container.offset(getOffset(container, offsetElement));
                }
            }
            updateHelperLocations();
            if (opts.showPalette) {
                drawPalette();
            }
            boundElement.trigger("reflow.spectrum");
        }
        function destroy() {
            boundElement.show();
            offsetElement.unbind("click.spectrum touchstart.spectrum");
            container.remove();
            replacer.remove();
            spectrums[spect.id] = null;
        }
        function option(optionName, optionValue) {
            if (optionName === undefined) {
                return $.extend({}, opts);
            }
            if (optionValue === undefined) {
                return opts[optionName];
            }
            opts[optionName] = optionValue;
            applyOptions();
        }
        function enable() {
            disabled = false;
            boundElement.attr("disabled", false);
            offsetElement.removeClass("sp-disabled");
        }
        function disable() {
            hide();
            disabled = true;
            boundElement.attr("disabled", true);
            offsetElement.addClass("sp-disabled");
        }
        function setOffset(coord) {
            opts.offset = coord;
            reflow();
        }
        initialize();
        var spect = {
            show: show,
            hide: hide,
            toggle: toggle,
            reflow: reflow,
            option: option,
            enable: enable,
            disable: disable,
            offset: setOffset,
            set: function(c) {
                set(c);
                updateOriginalInput();
            },
            get: get,
            destroy: destroy,
            container: container
        };
        spect.id = spectrums.push(spect) - 1;
        return spect;
    }
    function getOffset(picker, input) {
        var extraY = 0;
        var dpWidth = picker.outerWidth();
        var dpHeight = picker.outerHeight();
        var inputHeight = input.outerHeight();
        var doc = picker[0].ownerDocument;
        var docElem = doc.documentElement;
        var viewWidth = docElem.clientWidth + $(doc).scrollLeft();
        var viewHeight = docElem.clientHeight + $(doc).scrollTop();
        var offset = input.offset();
        offset.top += inputHeight;
        offset.left -= Math.min(offset.left, offset.left + dpWidth > viewWidth && viewWidth > dpWidth ? Math.abs(offset.left + dpWidth - viewWidth) : 0);
        offset.top -= Math.min(offset.top, offset.top + dpHeight > viewHeight && viewHeight > dpHeight ? Math.abs(dpHeight + inputHeight - extraY) : extraY);
        return offset;
    }
    function noop() {}
    function stopPropagation(e) {
        e.stopPropagation();
    }
    function bind(func, obj) {
        var slice = Array.prototype.slice;
        var args = slice.call(arguments, 2);
        return function() {
            return func.apply(obj, args.concat(slice.call(arguments)));
        };
    }
    function draggable(element, onmove, onstart, onstop) {
        onmove = onmove || function() {};
        onstart = onstart || function() {};
        onstop = onstop || function() {};
        var doc = document;
        var dragging = false;
        var offset = {};
        var maxHeight = 0;
        var maxWidth = 0;
        var hasTouch = "ontouchstart" in window;
        var duringDragEvents = {};
        duringDragEvents["selectstart"] = prevent;
        duringDragEvents["dragstart"] = prevent;
        duringDragEvents["touchmove mousemove"] = move;
        duringDragEvents["touchend mouseup"] = stop;
        function prevent(e) {
            if (e.stopPropagation) {
                e.stopPropagation();
            }
            if (e.preventDefault) {
                e.preventDefault();
            }
            e.returnValue = false;
        }
        function move(e) {
            if (dragging) {
                if (IE && doc.documentMode < 9 && !e.button) {
                    return stop();
                }
                var t0 = e.originalEvent && e.originalEvent.touches && e.originalEvent.touches[0];
                var pageX = t0 && t0.pageX || e.pageX;
                var pageY = t0 && t0.pageY || e.pageY;
                var dragX = Math.max(0, Math.min(pageX - offset.left, maxWidth));
                var dragY = Math.max(0, Math.min(pageY - offset.top, maxHeight));
                if (hasTouch) {
                    prevent(e);
                }
                onmove.apply(element, [ dragX, dragY, e ]);
            }
        }
        function start(e) {
            var rightclick = e.which ? e.which == 3 : e.button == 2;
            if (!rightclick && !dragging) {
                if (onstart.apply(element, arguments) !== false) {
                    dragging = true;
                    maxHeight = $(element).height();
                    maxWidth = $(element).width();
                    offset = $(element).offset();
                    $(doc).bind(duringDragEvents);
                    $(doc.body).addClass("sp-dragging");
                    move(e);
                    prevent(e);
                }
            }
        }
        function stop() {
            if (dragging) {
                $(doc).unbind(duringDragEvents);
                $(doc.body).removeClass("sp-dragging");
                setTimeout(function() {
                    onstop.apply(element, arguments);
                }, 0);
            }
            dragging = false;
        }
        $(element).bind("touchstart mousedown", start);
    }
    function throttle(func, wait, debounce) {
        var timeout;
        return function() {
            var context = this, args = arguments;
            var throttler = function() {
                timeout = null;
                func.apply(context, args);
            };
            if (debounce) clearTimeout(timeout);
            if (debounce || !timeout) timeout = setTimeout(throttler, wait);
        };
    }
    function inputTypeColorSupport() {
        return $.fn.spectrum.inputTypeColorSupport();
    }
    var dataID = "spectrum.id";
    $.fn.spectrum = function(opts, extra) {
        if (typeof opts == "string") {
            var returnValue = this;
            var args = Array.prototype.slice.call(arguments, 1);
            this.each(function() {
                var spect = spectrums[$(this).data(dataID)];
                if (spect) {
                    var method = spect[opts];
                    if (!method) {
                        throw new Error("Spectrum: no such method: '" + opts + "'");
                    }
                    if (opts == "get") {
                        returnValue = spect.get();
                    } else if (opts == "container") {
                        returnValue = spect.container;
                    } else if (opts == "option") {
                        returnValue = spect.option.apply(spect, args);
                    } else if (opts == "destroy") {
                        spect.destroy();
                        $(this).removeData(dataID);
                    } else {
                        method.apply(spect, args);
                    }
                }
            });
            return returnValue;
        }
        return this.spectrum("destroy").each(function() {
            var options = $.extend({}, opts, $(this).data());
            var spect = spectrum(this, options);
            $(this).data(dataID, spect.id);
        });
    };
    $.fn.spectrum.load = true;
    $.fn.spectrum.loadOpts = {};
    $.fn.spectrum.draggable = draggable;
    $.fn.spectrum.defaults = defaultOpts;
    $.fn.spectrum.inputTypeColorSupport = function inputTypeColorSupport() {
        if (typeof inputTypeColorSupport._cachedResult === "undefined") {
            var colorInput = $("<input type='color' value='!' />")[0];
            inputTypeColorSupport._cachedResult = colorInput.type === "color" && colorInput.value !== "!";
        }
        return inputTypeColorSupport._cachedResult;
    };
    $.spectrum = {};
    $.spectrum.localization = {};
    $.spectrum.palettes = {};
    $.fn.spectrum.processNativeColorInputs = function() {
        var colorInputs = $("input[type=color]");
        if (colorInputs.length && !inputTypeColorSupport()) {
            colorInputs.spectrum({
                preferredFormat: "hex6"
            });
        }
    };
    (function() {
        var trimLeft = /^[\s,#]+/, trimRight = /\s+$/, tinyCounter = 0, math = Math, mathRound = math.round, mathMin = math.min, mathMax = math.max, mathRandom = math.random;
        var tinycolor = function(color, opts) {
            color = color ? color : "";
            opts = opts || {};
            if (color instanceof tinycolor) {
                return color;
            }
            if (!(this instanceof tinycolor)) {
                return new tinycolor(color, opts);
            }
            var rgb = inputToRGB(color);
            this._originalInput = color, this._r = rgb.r, this._g = rgb.g, this._b = rgb.b, 
            this._a = rgb.a, this._roundA = mathRound(100 * this._a) / 100, this._format = opts.format || rgb.format;
            this._gradientType = opts.gradientType;
            if (this._r < 1) {
                this._r = mathRound(this._r);
            }
            if (this._g < 1) {
                this._g = mathRound(this._g);
            }
            if (this._b < 1) {
                this._b = mathRound(this._b);
            }
            this._ok = rgb.ok;
            this._tc_id = tinyCounter++;
        };
        tinycolor.prototype = {
            isDark: function() {
                return this.getBrightness() < 128;
            },
            isLight: function() {
                return !this.isDark();
            },
            isValid: function() {
                return this._ok;
            },
            getOriginalInput: function() {
                return this._originalInput;
            },
            getFormat: function() {
                return this._format;
            },
            getAlpha: function() {
                return this._a;
            },
            getBrightness: function() {
                var rgb = this.toRgb();
                return (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1e3;
            },
            setAlpha: function(value) {
                this._a = boundAlpha(value);
                this._roundA = mathRound(100 * this._a) / 100;
                return this;
            },
            toHsv: function() {
                var hsv = rgbToHsv(this._r, this._g, this._b);
                return {
                    h: hsv.h * 360,
                    s: hsv.s,
                    v: hsv.v,
                    a: this._a
                };
            },
            toHsvString: function() {
                var hsv = rgbToHsv(this._r, this._g, this._b);
                var h = mathRound(hsv.h * 360), s = mathRound(hsv.s * 100), v = mathRound(hsv.v * 100);
                return this._a == 1 ? "hsv(" + h + ", " + s + "%, " + v + "%)" : "hsva(" + h + ", " + s + "%, " + v + "%, " + this._roundA + ")";
            },
            toHsl: function() {
                var hsl = rgbToHsl(this._r, this._g, this._b);
                return {
                    h: hsl.h * 360,
                    s: hsl.s,
                    l: hsl.l,
                    a: this._a
                };
            },
            toHslString: function() {
                var hsl = rgbToHsl(this._r, this._g, this._b);
                var h = mathRound(hsl.h * 360), s = mathRound(hsl.s * 100), l = mathRound(hsl.l * 100);
                return this._a == 1 ? "hsl(" + h + ", " + s + "%, " + l + "%)" : "hsla(" + h + ", " + s + "%, " + l + "%, " + this._roundA + ")";
            },
            toHex: function(allow3Char) {
                return rgbToHex(this._r, this._g, this._b, allow3Char);
            },
            toHexString: function(allow3Char) {
                return "#" + this.toHex(allow3Char);
            },
            toHex8: function() {
                return rgbaToHex(this._r, this._g, this._b, this._a);
            },
            toHex8String: function() {
                return "#" + this.toHex8();
            },
            toRgb: function() {
                return {
                    r: mathRound(this._r),
                    g: mathRound(this._g),
                    b: mathRound(this._b),
                    a: this._a
                };
            },
            toRgbString: function() {
                return this._a == 1 ? "rgb(" + mathRound(this._r) + ", " + mathRound(this._g) + ", " + mathRound(this._b) + ")" : "rgba(" + mathRound(this._r) + ", " + mathRound(this._g) + ", " + mathRound(this._b) + ", " + this._roundA + ")";
            },
            toPercentageRgb: function() {
                return {
                    r: mathRound(bound01(this._r, 255) * 100) + "%",
                    g: mathRound(bound01(this._g, 255) * 100) + "%",
                    b: mathRound(bound01(this._b, 255) * 100) + "%",
                    a: this._a
                };
            },
            toPercentageRgbString: function() {
                return this._a == 1 ? "rgb(" + mathRound(bound01(this._r, 255) * 100) + "%, " + mathRound(bound01(this._g, 255) * 100) + "%, " + mathRound(bound01(this._b, 255) * 100) + "%)" : "rgba(" + mathRound(bound01(this._r, 255) * 100) + "%, " + mathRound(bound01(this._g, 255) * 100) + "%, " + mathRound(bound01(this._b, 255) * 100) + "%, " + this._roundA + ")";
            },
            toName: function() {
                if (this._a === 0) {
                    return "transparent";
                }
                if (this._a < 1) {
                    return false;
                }
                return hexNames[rgbToHex(this._r, this._g, this._b, true)] || false;
            },
            toFilter: function(secondColor) {
                var hex8String = "#" + rgbaToHex(this._r, this._g, this._b, this._a);
                var secondHex8String = hex8String;
                var gradientType = this._gradientType ? "GradientType = 1, " : "";
                if (secondColor) {
                    var s = tinycolor(secondColor);
                    secondHex8String = s.toHex8String();
                }
                return "progid:DXImageTransform.Microsoft.gradient(" + gradientType + "startColorstr=" + hex8String + ",endColorstr=" + secondHex8String + ")";
            },
            toString: function(format) {
                var formatSet = !!format;
                format = format || this._format;
                var formattedString = false;
                var hasAlpha = this._a < 1 && this._a >= 0;
                var needsAlphaFormat = !formatSet && hasAlpha && (format === "hex" || format === "hex6" || format === "hex3" || format === "name");
                if (needsAlphaFormat) {
                    if (format === "name" && this._a === 0) {
                        return this.toName();
                    }
                    return this.toRgbString();
                }
                if (format === "rgb") {
                    formattedString = this.toRgbString();
                }
                if (format === "prgb") {
                    formattedString = this.toPercentageRgbString();
                }
                if (format === "hex" || format === "hex6") {
                    formattedString = this.toHexString();
                }
                if (format === "hex3") {
                    formattedString = this.toHexString(true);
                }
                if (format === "hex8") {
                    formattedString = this.toHex8String();
                }
                if (format === "name") {
                    formattedString = this.toName();
                }
                if (format === "hsl") {
                    formattedString = this.toHslString();
                }
                if (format === "hsv") {
                    formattedString = this.toHsvString();
                }
                return formattedString || this.toHexString();
            },
            _applyModification: function(fn, args) {
                var color = fn.apply(null, [ this ].concat([].slice.call(args)));
                this._r = color._r;
                this._g = color._g;
                this._b = color._b;
                this.setAlpha(color._a);
                return this;
            },
            lighten: function() {
                return this._applyModification(lighten, arguments);
            },
            brighten: function() {
                return this._applyModification(brighten, arguments);
            },
            darken: function() {
                return this._applyModification(darken, arguments);
            },
            desaturate: function() {
                return this._applyModification(desaturate, arguments);
            },
            saturate: function() {
                return this._applyModification(saturate, arguments);
            },
            greyscale: function() {
                return this._applyModification(greyscale, arguments);
            },
            spin: function() {
                return this._applyModification(spin, arguments);
            },
            _applyCombination: function(fn, args) {
                return fn.apply(null, [ this ].concat([].slice.call(args)));
            },
            analogous: function() {
                return this._applyCombination(analogous, arguments);
            },
            complement: function() {
                return this._applyCombination(complement, arguments);
            },
            monochromatic: function() {
                return this._applyCombination(monochromatic, arguments);
            },
            splitcomplement: function() {
                return this._applyCombination(splitcomplement, arguments);
            },
            triad: function() {
                return this._applyCombination(triad, arguments);
            },
            tetrad: function() {
                return this._applyCombination(tetrad, arguments);
            }
        };
        tinycolor.fromRatio = function(color, opts) {
            if (typeof color == "object") {
                var newColor = {};
                for (var i in color) {
                    if (color.hasOwnProperty(i)) {
                        if (i === "a") {
                            newColor[i] = color[i];
                        } else {
                            newColor[i] = convertToPercentage(color[i]);
                        }
                    }
                }
                color = newColor;
            }
            return tinycolor(color, opts);
        };
        function inputToRGB(color) {
            var rgb = {
                r: 0,
                g: 0,
                b: 0
            };
            var a = 1;
            var ok = false;
            var format = false;
            if (typeof color == "string") {
                color = stringInputToObject(color);
            }
            if (typeof color == "object") {
                if (color.hasOwnProperty("r") && color.hasOwnProperty("g") && color.hasOwnProperty("b")) {
                    rgb = rgbToRgb(color.r, color.g, color.b);
                    ok = true;
                    format = String(color.r).substr(-1) === "%" ? "prgb" : "rgb";
                } else if (color.hasOwnProperty("h") && color.hasOwnProperty("s") && color.hasOwnProperty("v")) {
                    color.s = convertToPercentage(color.s);
                    color.v = convertToPercentage(color.v);
                    rgb = hsvToRgb(color.h, color.s, color.v);
                    ok = true;
                    format = "hsv";
                } else if (color.hasOwnProperty("h") && color.hasOwnProperty("s") && color.hasOwnProperty("l")) {
                    color.s = convertToPercentage(color.s);
                    color.l = convertToPercentage(color.l);
                    rgb = hslToRgb(color.h, color.s, color.l);
                    ok = true;
                    format = "hsl";
                }
                if (color.hasOwnProperty("a")) {
                    a = color.a;
                }
            }
            a = boundAlpha(a);
            return {
                ok: ok,
                format: color.format || format,
                r: mathMin(255, mathMax(rgb.r, 0)),
                g: mathMin(255, mathMax(rgb.g, 0)),
                b: mathMin(255, mathMax(rgb.b, 0)),
                a: a
            };
        }
        function rgbToRgb(r, g, b) {
            return {
                r: bound01(r, 255) * 255,
                g: bound01(g, 255) * 255,
                b: bound01(b, 255) * 255
            };
        }
        function rgbToHsl(r, g, b) {
            r = bound01(r, 255);
            g = bound01(g, 255);
            b = bound01(b, 255);
            var max = mathMax(r, g, b), min = mathMin(r, g, b);
            var h, s, l = (max + min) / 2;
            if (max == min) {
                h = s = 0;
            } else {
                var d = max - min;
                s = l > .5 ? d / (2 - max - min) : d / (max + min);
                switch (max) {
                  case r:
                    h = (g - b) / d + (g < b ? 6 : 0);
                    break;

                  case g:
                    h = (b - r) / d + 2;
                    break;

                  case b:
                    h = (r - g) / d + 4;
                    break;
                }
                h /= 6;
            }
            return {
                h: h,
                s: s,
                l: l
            };
        }
        function hslToRgb(h, s, l) {
            var r, g, b;
            h = bound01(h, 360);
            s = bound01(s, 100);
            l = bound01(l, 100);
            function hue2rgb(p, q, t) {
                if (t < 0) t += 1;
                if (t > 1) t -= 1;
                if (t < 1 / 6) return p + (q - p) * 6 * t;
                if (t < 1 / 2) return q;
                if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
                return p;
            }
            if (s === 0) {
                r = g = b = l;
            } else {
                var q = l < .5 ? l * (1 + s) : l + s - l * s;
                var p = 2 * l - q;
                r = hue2rgb(p, q, h + 1 / 3);
                g = hue2rgb(p, q, h);
                b = hue2rgb(p, q, h - 1 / 3);
            }
            return {
                r: r * 255,
                g: g * 255,
                b: b * 255
            };
        }
        function rgbToHsv(r, g, b) {
            r = bound01(r, 255);
            g = bound01(g, 255);
            b = bound01(b, 255);
            var max = mathMax(r, g, b), min = mathMin(r, g, b);
            var h, s, v = max;
            var d = max - min;
            s = max === 0 ? 0 : d / max;
            if (max == min) {
                h = 0;
            } else {
                switch (max) {
                  case r:
                    h = (g - b) / d + (g < b ? 6 : 0);
                    break;

                  case g:
                    h = (b - r) / d + 2;
                    break;

                  case b:
                    h = (r - g) / d + 4;
                    break;
                }
                h /= 6;
            }
            return {
                h: h,
                s: s,
                v: v
            };
        }
        function hsvToRgb(h, s, v) {
            h = bound01(h, 360) * 6;
            s = bound01(s, 100);
            v = bound01(v, 100);
            var i = math.floor(h), f = h - i, p = v * (1 - s), q = v * (1 - f * s), t = v * (1 - (1 - f) * s), mod = i % 6, r = [ v, q, p, p, t, v ][mod], g = [ t, v, v, q, p, p ][mod], b = [ p, p, t, v, v, q ][mod];
            return {
                r: r * 255,
                g: g * 255,
                b: b * 255
            };
        }
        function rgbToHex(r, g, b, allow3Char) {
            var hex = [ pad2(mathRound(r).toString(16)), pad2(mathRound(g).toString(16)), pad2(mathRound(b).toString(16)) ];
            if (allow3Char && hex[0].charAt(0) == hex[0].charAt(1) && hex[1].charAt(0) == hex[1].charAt(1) && hex[2].charAt(0) == hex[2].charAt(1)) {
                return hex[0].charAt(0) + hex[1].charAt(0) + hex[2].charAt(0);
            }
            return hex.join("");
        }
        function rgbaToHex(r, g, b, a) {
            var hex = [ pad2(convertDecimalToHex(a)), pad2(mathRound(r).toString(16)), pad2(mathRound(g).toString(16)), pad2(mathRound(b).toString(16)) ];
            return hex.join("");
        }
        tinycolor.equals = function(color1, color2) {
            if (!color1 || !color2) {
                return false;
            }
            return tinycolor(color1).toRgbString() == tinycolor(color2).toRgbString();
        };
        tinycolor.random = function() {
            return tinycolor.fromRatio({
                r: mathRandom(),
                g: mathRandom(),
                b: mathRandom()
            });
        };
        function desaturate(color, amount) {
            amount = amount === 0 ? 0 : amount || 10;
            var hsl = tinycolor(color).toHsl();
            hsl.s -= amount / 100;
            hsl.s = clamp01(hsl.s);
            return tinycolor(hsl);
        }
        function saturate(color, amount) {
            amount = amount === 0 ? 0 : amount || 10;
            var hsl = tinycolor(color).toHsl();
            hsl.s += amount / 100;
            hsl.s = clamp01(hsl.s);
            return tinycolor(hsl);
        }
        function greyscale(color) {
            return tinycolor(color).desaturate(100);
        }
        function lighten(color, amount) {
            amount = amount === 0 ? 0 : amount || 10;
            var hsl = tinycolor(color).toHsl();
            hsl.l += amount / 100;
            hsl.l = clamp01(hsl.l);
            return tinycolor(hsl);
        }
        function brighten(color, amount) {
            amount = amount === 0 ? 0 : amount || 10;
            var rgb = tinycolor(color).toRgb();
            rgb.r = mathMax(0, mathMin(255, rgb.r - mathRound(255 * -(amount / 100))));
            rgb.g = mathMax(0, mathMin(255, rgb.g - mathRound(255 * -(amount / 100))));
            rgb.b = mathMax(0, mathMin(255, rgb.b - mathRound(255 * -(amount / 100))));
            return tinycolor(rgb);
        }
        function darken(color, amount) {
            amount = amount === 0 ? 0 : amount || 10;
            var hsl = tinycolor(color).toHsl();
            hsl.l -= amount / 100;
            hsl.l = clamp01(hsl.l);
            return tinycolor(hsl);
        }
        function spin(color, amount) {
            var hsl = tinycolor(color).toHsl();
            var hue = (mathRound(hsl.h) + amount) % 360;
            hsl.h = hue < 0 ? 360 + hue : hue;
            return tinycolor(hsl);
        }
        function complement(color) {
            var hsl = tinycolor(color).toHsl();
            hsl.h = (hsl.h + 180) % 360;
            return tinycolor(hsl);
        }
        function triad(color) {
            var hsl = tinycolor(color).toHsl();
            var h = hsl.h;
            return [ tinycolor(color), tinycolor({
                h: (h + 120) % 360,
                s: hsl.s,
                l: hsl.l
            }), tinycolor({
                h: (h + 240) % 360,
                s: hsl.s,
                l: hsl.l
            }) ];
        }
        function tetrad(color) {
            var hsl = tinycolor(color).toHsl();
            var h = hsl.h;
            return [ tinycolor(color), tinycolor({
                h: (h + 90) % 360,
                s: hsl.s,
                l: hsl.l
            }), tinycolor({
                h: (h + 180) % 360,
                s: hsl.s,
                l: hsl.l
            }), tinycolor({
                h: (h + 270) % 360,
                s: hsl.s,
                l: hsl.l
            }) ];
        }
        function splitcomplement(color) {
            var hsl = tinycolor(color).toHsl();
            var h = hsl.h;
            return [ tinycolor(color), tinycolor({
                h: (h + 72) % 360,
                s: hsl.s,
                l: hsl.l
            }), tinycolor({
                h: (h + 216) % 360,
                s: hsl.s,
                l: hsl.l
            }) ];
        }
        function analogous(color, results, slices) {
            results = results || 6;
            slices = slices || 30;
            var hsl = tinycolor(color).toHsl();
            var part = 360 / slices;
            var ret = [ tinycolor(color) ];
            for (hsl.h = (hsl.h - (part * results >> 1) + 720) % 360; --results; ) {
                hsl.h = (hsl.h + part) % 360;
                ret.push(tinycolor(hsl));
            }
            return ret;
        }
        function monochromatic(color, results) {
            results = results || 6;
            var hsv = tinycolor(color).toHsv();
            var h = hsv.h, s = hsv.s, v = hsv.v;
            var ret = [];
            var modification = 1 / results;
            while (results--) {
                ret.push(tinycolor({
                    h: h,
                    s: s,
                    v: v
                }));
                v = (v + modification) % 1;
            }
            return ret;
        }
        tinycolor.mix = function(color1, color2, amount) {
            amount = amount === 0 ? 0 : amount || 50;
            var rgb1 = tinycolor(color1).toRgb();
            var rgb2 = tinycolor(color2).toRgb();
            var p = amount / 100;
            var w = p * 2 - 1;
            var a = rgb2.a - rgb1.a;
            var w1;
            if (w * a == -1) {
                w1 = w;
            } else {
                w1 = (w + a) / (1 + w * a);
            }
            w1 = (w1 + 1) / 2;
            var w2 = 1 - w1;
            var rgba = {
                r: rgb2.r * w1 + rgb1.r * w2,
                g: rgb2.g * w1 + rgb1.g * w2,
                b: rgb2.b * w1 + rgb1.b * w2,
                a: rgb2.a * p + rgb1.a * (1 - p)
            };
            return tinycolor(rgba);
        };
        tinycolor.readability = function(color1, color2) {
            var c1 = tinycolor(color1);
            var c2 = tinycolor(color2);
            var rgb1 = c1.toRgb();
            var rgb2 = c2.toRgb();
            var brightnessA = c1.getBrightness();
            var brightnessB = c2.getBrightness();
            var colorDiff = Math.max(rgb1.r, rgb2.r) - Math.min(rgb1.r, rgb2.r) + Math.max(rgb1.g, rgb2.g) - Math.min(rgb1.g, rgb2.g) + Math.max(rgb1.b, rgb2.b) - Math.min(rgb1.b, rgb2.b);
            return {
                brightness: Math.abs(brightnessA - brightnessB),
                color: colorDiff
            };
        };
        tinycolor.isReadable = function(color1, color2) {
            var readability = tinycolor.readability(color1, color2);
            return readability.brightness > 125 && readability.color > 500;
        };
        tinycolor.mostReadable = function(baseColor, colorList) {
            var bestColor = null;
            var bestScore = 0;
            var bestIsReadable = false;
            for (var i = 0; i < colorList.length; i++) {
                var readability = tinycolor.readability(baseColor, colorList[i]);
                var readable = readability.brightness > 125 && readability.color > 500;
                var score = 3 * (readability.brightness / 125) + readability.color / 500;
                if (readable && !bestIsReadable || readable && bestIsReadable && score > bestScore || !readable && !bestIsReadable && score > bestScore) {
                    bestIsReadable = readable;
                    bestScore = score;
                    bestColor = tinycolor(colorList[i]);
                }
            }
            return bestColor;
        };
        var names = tinycolor.names = {
            aliceblue: "f0f8ff",
            antiquewhite: "faebd7",
            aqua: "0ff",
            aquamarine: "7fffd4",
            azure: "f0ffff",
            beige: "f5f5dc",
            bisque: "ffe4c4",
            black: "000",
            blanchedalmond: "ffebcd",
            blue: "00f",
            blueviolet: "8a2be2",
            brown: "a52a2a",
            burlywood: "deb887",
            burntsienna: "ea7e5d",
            cadetblue: "5f9ea0",
            chartreuse: "7fff00",
            chocolate: "d2691e",
            coral: "ff7f50",
            cornflowerblue: "6495ed",
            cornsilk: "fff8dc",
            crimson: "dc143c",
            cyan: "0ff",
            darkblue: "00008b",
            darkcyan: "008b8b",
            darkgoldenrod: "b8860b",
            darkgray: "a9a9a9",
            darkgreen: "006400",
            darkgrey: "a9a9a9",
            darkkhaki: "bdb76b",
            darkmagenta: "8b008b",
            darkolivegreen: "556b2f",
            darkorange: "ff8c00",
            darkorchid: "9932cc",
            darkred: "8b0000",
            darksalmon: "e9967a",
            darkseagreen: "8fbc8f",
            darkslateblue: "483d8b",
            darkslategray: "2f4f4f",
            darkslategrey: "2f4f4f",
            darkturquoise: "00ced1",
            darkviolet: "9400d3",
            deeppink: "ff1493",
            deepskyblue: "00bfff",
            dimgray: "696969",
            dimgrey: "696969",
            dodgerblue: "1e90ff",
            firebrick: "b22222",
            floralwhite: "fffaf0",
            forestgreen: "228b22",
            fuchsia: "f0f",
            gainsboro: "dcdcdc",
            ghostwhite: "f8f8ff",
            gold: "ffd700",
            goldenrod: "daa520",
            gray: "808080",
            green: "008000",
            greenyellow: "adff2f",
            grey: "808080",
            honeydew: "f0fff0",
            hotpink: "ff69b4",
            indianred: "cd5c5c",
            indigo: "4b0082",
            ivory: "fffff0",
            khaki: "f0e68c",
            lavender: "e6e6fa",
            lavenderblush: "fff0f5",
            lawngreen: "7cfc00",
            lemonchiffon: "fffacd",
            lightblue: "add8e6",
            lightcoral: "f08080",
            lightcyan: "e0ffff",
            lightgoldenrodyellow: "fafad2",
            lightgray: "d3d3d3",
            lightgreen: "90ee90",
            lightgrey: "d3d3d3",
            lightpink: "ffb6c1",
            lightsalmon: "ffa07a",
            lightseagreen: "20b2aa",
            lightskyblue: "87cefa",
            lightslategray: "789",
            lightslategrey: "789",
            lightsteelblue: "b0c4de",
            lightyellow: "ffffe0",
            lime: "0f0",
            limegreen: "32cd32",
            linen: "faf0e6",
            magenta: "f0f",
            maroon: "800000",
            mediumaquamarine: "66cdaa",
            mediumblue: "0000cd",
            mediumorchid: "ba55d3",
            mediumpurple: "9370db",
            mediumseagreen: "3cb371",
            mediumslateblue: "7b68ee",
            mediumspringgreen: "00fa9a",
            mediumturquoise: "48d1cc",
            mediumvioletred: "c71585",
            midnightblue: "191970",
            mintcream: "f5fffa",
            mistyrose: "ffe4e1",
            moccasin: "ffe4b5",
            navajowhite: "ffdead",
            navy: "000080",
            oldlace: "fdf5e6",
            olive: "808000",
            olivedrab: "6b8e23",
            orange: "ffa500",
            orangered: "ff4500",
            orchid: "da70d6",
            palegoldenrod: "eee8aa",
            palegreen: "98fb98",
            paleturquoise: "afeeee",
            palevioletred: "db7093",
            papayawhip: "ffefd5",
            peachpuff: "ffdab9",
            peru: "cd853f",
            pink: "ffc0cb",
            plum: "dda0dd",
            powderblue: "b0e0e6",
            purple: "800080",
            rebeccapurple: "663399",
            red: "f00",
            rosybrown: "bc8f8f",
            royalblue: "4169e1",
            saddlebrown: "8b4513",
            salmon: "fa8072",
            sandybrown: "f4a460",
            seagreen: "2e8b57",
            seashell: "fff5ee",
            sienna: "a0522d",
            silver: "c0c0c0",
            skyblue: "87ceeb",
            slateblue: "6a5acd",
            slategray: "708090",
            slategrey: "708090",
            snow: "fffafa",
            springgreen: "00ff7f",
            steelblue: "4682b4",
            tan: "d2b48c",
            teal: "008080",
            thistle: "d8bfd8",
            tomato: "ff6347",
            turquoise: "40e0d0",
            violet: "ee82ee",
            wheat: "f5deb3",
            white: "fff",
            whitesmoke: "f5f5f5",
            yellow: "ff0",
            yellowgreen: "9acd32"
        };
        var hexNames = tinycolor.hexNames = flip(names);
        function flip(o) {
            var flipped = {};
            for (var i in o) {
                if (o.hasOwnProperty(i)) {
                    flipped[o[i]] = i;
                }
            }
            return flipped;
        }
        function boundAlpha(a) {
            a = parseFloat(a);
            if (isNaN(a) || a < 0 || a > 1) {
                a = 1;
            }
            return a;
        }
        function bound01(n, max) {
            if (isOnePointZero(n)) {
                n = "100%";
            }
            var processPercent = isPercentage(n);
            n = mathMin(max, mathMax(0, parseFloat(n)));
            if (processPercent) {
                n = parseInt(n * max, 10) / 100;
            }
            if (math.abs(n - max) < 1e-6) {
                return 1;
            }
            return n % max / parseFloat(max);
        }
        function clamp01(val) {
            return mathMin(1, mathMax(0, val));
        }
        function parseIntFromHex(val) {
            return parseInt(val, 16);
        }
        function isOnePointZero(n) {
            return typeof n == "string" && n.indexOf(".") != -1 && parseFloat(n) === 1;
        }
        function isPercentage(n) {
            return typeof n === "string" && n.indexOf("%") != -1;
        }
        function pad2(c) {
            return c.length == 1 ? "0" + c : "" + c;
        }
        function convertToPercentage(n) {
            if (n <= 1) {
                n = n * 100 + "%";
            }
            return n;
        }
        function convertDecimalToHex(d) {
            return Math.round(parseFloat(d) * 255).toString(16);
        }
        function convertHexToDecimal(h) {
            return parseIntFromHex(h) / 255;
        }
        var matchers = function() {
            var CSS_INTEGER = "[-\\+]?\\d+%?";
            var CSS_NUMBER = "[-\\+]?\\d*\\.\\d+%?";
            var CSS_UNIT = "(?:" + CSS_NUMBER + ")|(?:" + CSS_INTEGER + ")";
            var PERMISSIVE_MATCH3 = "[\\s|\\(]+(" + CSS_UNIT + ")[,|\\s]+(" + CSS_UNIT + ")[,|\\s]+(" + CSS_UNIT + ")\\s*\\)?";
            var PERMISSIVE_MATCH4 = "[\\s|\\(]+(" + CSS_UNIT + ")[,|\\s]+(" + CSS_UNIT + ")[,|\\s]+(" + CSS_UNIT + ")[,|\\s]+(" + CSS_UNIT + ")\\s*\\)?";
            return {
                rgb: new RegExp("rgb" + PERMISSIVE_MATCH3),
                rgba: new RegExp("rgba" + PERMISSIVE_MATCH4),
                hsl: new RegExp("hsl" + PERMISSIVE_MATCH3),
                hsla: new RegExp("hsla" + PERMISSIVE_MATCH4),
                hsv: new RegExp("hsv" + PERMISSIVE_MATCH3),
                hsva: new RegExp("hsva" + PERMISSIVE_MATCH4),
                hex3: /^([0-9a-fA-F]{1})([0-9a-fA-F]{1})([0-9a-fA-F]{1})$/,
                hex6: /^([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})$/,
                hex8: /^([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})$/
            };
        }();
        function stringInputToObject(color) {
            color = color.replace(trimLeft, "").replace(trimRight, "").toLowerCase();
            var named = false;
            if (names[color]) {
                color = names[color];
                named = true;
            } else if (color == "transparent") {
                return {
                    r: 0,
                    g: 0,
                    b: 0,
                    a: 0,
                    format: "name"
                };
            }
            var match;
            if (match = matchers.rgb.exec(color)) {
                return {
                    r: match[1],
                    g: match[2],
                    b: match[3]
                };
            }
            if (match = matchers.rgba.exec(color)) {
                return {
                    r: match[1],
                    g: match[2],
                    b: match[3],
                    a: match[4]
                };
            }
            if (match = matchers.hsl.exec(color)) {
                return {
                    h: match[1],
                    s: match[2],
                    l: match[3]
                };
            }
            if (match = matchers.hsla.exec(color)) {
                return {
                    h: match[1],
                    s: match[2],
                    l: match[3],
                    a: match[4]
                };
            }
            if (match = matchers.hsv.exec(color)) {
                return {
                    h: match[1],
                    s: match[2],
                    v: match[3]
                };
            }
            if (match = matchers.hsva.exec(color)) {
                return {
                    h: match[1],
                    s: match[2],
                    v: match[3],
                    a: match[4]
                };
            }
            if (match = matchers.hex8.exec(color)) {
                return {
                    a: convertHexToDecimal(match[1]),
                    r: parseIntFromHex(match[2]),
                    g: parseIntFromHex(match[3]),
                    b: parseIntFromHex(match[4]),
                    format: named ? "name" : "hex8"
                };
            }
            if (match = matchers.hex6.exec(color)) {
                return {
                    r: parseIntFromHex(match[1]),
                    g: parseIntFromHex(match[2]),
                    b: parseIntFromHex(match[3]),
                    format: named ? "name" : "hex"
                };
            }
            if (match = matchers.hex3.exec(color)) {
                return {
                    r: parseIntFromHex(match[1] + "" + match[1]),
                    g: parseIntFromHex(match[2] + "" + match[2]),
                    b: parseIntFromHex(match[3] + "" + match[3]),
                    format: named ? "name" : "hex"
                };
            }
            return false;
        }
        window.tinycolor = tinycolor;
    })();
    $(function() {
        if ($.fn.spectrum.load) {
            $.fn.spectrum.processNativeColorInputs();
        }
    });
});

(function($) {
    var localization = $.spectrum.localization["sv"] = {
        cancelText: "Avbryt",
        chooseText: "Välj"
    };
    $.extend($.fn.spectrum.defaults, localization);
})(jQuery);

angular.module("angular-toArrayFilter", []).filter("toArray", function() {
    return function(obj, addKey) {
        if (!angular.isObject(obj)) return obj;
        if (addKey === false) {
            return Object.keys(obj).map(function(key) {
                return obj[key];
            });
        } else {
            return Object.keys(obj).map(function(key) {
                var value = obj[key];
                return angular.isObject(value) ? Object.defineProperty(value, "$key", {
                    enumerable: false,
                    value: key
                }) : {
                    $key: key,
                    $value: value
                };
            });
        }
    };
});

angular.module("schemaForm").run([ "$templateCache", function($templateCache) {
    $templateCache.put("directives/decorators/bootstrap/select2/select2.html", '<style>\r\n    .select2 > .select2-choice.ui-select-match {\r\n        /* Because of the inclusion of Bootstrap */\r\n        height: 29px;\r\n    }\r\n\r\n    .selectize-control > .selectize-dropdown {\r\n        top: 36px;\r\n    }\r\n</style>\r\n\r\n<div class="form-group {{form.htmlClass}}" ng-class="{\'has-error\': hasError()}">\r\n    <label class="control-label" ng-show="showTitle()">{{form.title}}</label>\r\n\r\n    <div class="input-group">\r\n        <ui-select select2-search\r\n                   ng-show="form.key"\r\n                   ng-model="$$value$$"\r\n                   ng-model-options="form.ngModelOptions"\r\n                   ng-disabled="form.readonly"\r\n                   sf-changed="form"\r\n                   ref="form.ref"\r\n                   query="form.query"\r\n                   shard="form.shard"\r\n                   depends-on="form.dependsOn">\r\n            <ui-select-match allow-clear="true"\r\n                    ng-model="$$value$$" placeholder="Search for {{form.title}}">\r\n                {{printSelectedElement($select.selected)}}\r\n            </ui-select-match>\r\n            <ui-select-choices\r\n                    sf-changed="form"\r\n                    ng-model="$$value$$" refresh="search($select)" refresh-delay="0"\r\n                    repeat="selectIdField(item) as item in searchRes">\r\n                <div ng-bind-html="selectDisplayField(item) | highlight: $select.search"></div>\r\n                <small>\r\n                    <i>&lt;<span ng-bind-html="selectIdField(item)"></span>&gt;</i>\r\n                </small>\r\n            </ui-select-choices>\r\n        </ui-select>\r\n        <span class="input-group-btn">\r\n            <create-update-modal class="btn btn-primary"\r\n                                 ng-model="$$value$$"\r\n                                 sf-changed="form"\r\n                                 ref="form.ref" ng-click="open()">New {{form.ref}}\r\n            </create-update-modal>\r\n            <create-update-modal class="btn btn-warning"\r\n                                 ng-model="$$value$$"\r\n                                 sf-changed="form"\r\n                                 ref="form.ref" type="edit" ng-show="$$value$$" ng-click="open()">Edit\r\n            </create-update-modal>\r\n            \x3c!--<button class="btn btn-primary" ng-click="open()">Create {{form.title}}</button>--\x3e\r\n        </span>\r\n    </div>\r\n    <span class="help-block">{{ (hasError() && errorMessage(schemaError())) || form.description}}</span>\r\n</div>\r\n\r\n<script type="text/ng-template" id="createUpdateModal.html">\r\n    <div class="modal-header">\r\n        <h3 class="modal-title">Create a new {{schema.title}}</h3>\r\n    </div>\r\n    <div class="modal-body">\r\n        <form name="ngForm" sf-schema="schema" sf-form="form" sf-model="model" ng-submit="submitForm(ngForm,model)">\r\n            <input type="submit" id="submit-form-{{schema.title}}" class="hidden"/></form>\r\n    </div>\r\n    <div class="modal-footer">\r\n        <button class="btn btn-warning" ng-click="cancel()">Cancel</button>\r\n        <label class="btn btn-primary" for="submit-form-{{schema.title}}">Save</label>\x3c!--Ñapon del 15, pero fa el submit sense haver de fer coses rares :)--\x3e\r\n    </div>\r\n<\/script>');
} ]);

angular.module("schemaForm").directive("select2Search", [ "$http", "$routeParams", "models", "common", "selectCache", function($http, $routeParams, models, common, selectCache) {
    return {
        restrict: "A",
        scope: true,
        require: [ "ngModel" ],
        link: function(scope, element, attrs, ngModel) {
            var modelName = $routeParams.schema;
            var shard = $routeParams.shard;
            if (!element.select) return;
            var displayField = "";
            var idSelect = "";
            var userq = scope.$eval(attrs.query);
            var userShard = scope.$eval(attrs.shard);
            if (userShard) {
                userShard.replace("/this./", scope.$eval(attrs.key));
                var actualShard = common.getField(userShard, scope.model);
                if (actualShard) {
                    shard = actualShard;
                }
            }
            var dependsOn = scope.$eval(attrs.dependsOn);
            if (dependsOn) {
                dependsOn = dependsOn.split("=");
            }
            function getDocumentById(modelId) {
                return function(query, skip) {
                    return models.getModel(scope.$eval(attrs.ref), function(m) {
                        var config = m.config;
                        var elem = "";
                        if (modelId instanceof Object) {
                            elem = modelId[config.id];
                        } else {
                            elem = modelId;
                        }
                        selectCache.getDocument(scope.$eval(attrs.ref), elem, shard, function(doc) {
                            displayField = config.displayField;
                            idSelect = config.id;
                            var q = {};
                            q.query = {};
                            var regex = query.search;
                            q.query.$or = [];
                            var forDisplay = {};
                            forDisplay[displayField] = {
                                $regex: regex,
                                $options: "i"
                            };
                            q.query.$or.push(forDisplay);
                            if (config.id != "_id" && m.schema[config.id] && m.schema[config.id].type == "string") {
                                var forID = {};
                                forID[idSelect] = {
                                    $regex: regex,
                                    $options: "i"
                                };
                                q.query.$or.push(forID);
                            }
                            if (dependsOn) {
                                if (dependsOn[0] && scope.model[dependsOn[1]]) {
                                    if (!isValidObjectID(scope.model[dependsOn[1]])) {
                                        q.query[dependsOn[0]] = {
                                            $regex: scope.model[dependsOn[1]],
                                            $options: "i"
                                        };
                                    } else {
                                        q.query[dependsOn[0]] = scope.model[dependsOn[1]];
                                    }
                                }
                            }
                            function isValidObjectID(str) {
                                return /^[0-9a-fA-F]{24}$/.test(str);
                            }
                            q.limit = 20;
                            q.skip = skip;
                            angular.extend(q, userq || {});
                            selectCache.search(scope.$eval(attrs.ref), q, shard, function(response, count) {
                                if (skip) scope.searchRes = scope.searchRes.concat(response); else scope.searchRes = response;
                                if (doc) {
                                    var present = scope.searchRes.some(function(element) {
                                        return element[config.id] == doc[config.id];
                                    });
                                    if (!present) {
                                        scope.searchRes.splice(0, 0, doc);
                                    }
                                }
                            });
                        });
                    });
                };
            }
            var elements = getDocumentById(scope.$eval(attrs.ngModel));
            scope.$watch(function() {
                if (dependsOn) {
                    if (scope.model[dependsOn[1]]) return scope.model[dependsOn[1]];
                }
            }, function(newValue) {
                getDocumentById(scope.$eval(attrs.ngModel))({
                    search: ""
                });
            });
            scope.disabled = false;
            scope.searchEnabled = true;
            scope.searchRes = [];
            scope.search = elements;
            scope.printSelectedElement = function(document) {
                if (document) {
                    var f = common.getField(displayField, document);
                    if (f && f != "" && f.length > 0) return f + " <" + document[idSelect] + ">"; else {
                        return "No display field. ID: <" + document[idSelect] + ">";
                    }
                }
            };
            scope.selectDisplayField = function(document) {
                if (document) {
                    var f = common.getField(displayField, document);
                    if (f && f != "" && f.length > 0) return f; else {
                        return "<empty>";
                    }
                }
            };
            scope.selectIdField = function(document) {
                if (document != undefined) {
                    return document[idSelect] || "No ID";
                }
            };
            scope.$on("refreshSelect2" + scope.$eval(attrs.ref), function() {
                console.log("REFRESH SELECT2");
                elements();
            });
            element.find("ul").bind("scroll", function() {
                var raw = arguments[0].target;
                if (raw.scrollTop + raw.offsetHeight > raw.scrollHeight) {
                    elements(scope.$select, raw.children[0].children.length - 2);
                }
            });
            models.getModelConfig(modelName, function(cfg) {
                if (cfg.shard && cfg.shard.shardKey) {
                    var init = true;
                    scope.$watch("model." + cfg.shard.shardKey, function(Nv, Ov) {
                        if (init) {
                            if (Nv && !shard) shard = Nv;
                            init = false;
                        } else {
                            if (Nv && Nv != Ov) {
                                scope.$select.clear(new Event("shard-key-changed"));
                                shard = Nv;
                            }
                        }
                    });
                }
            });
        }
    };
} ]);

var modalController = function($scope, $http, $modalInstance, $routeParams, models, configs, modelName, id, dependsOn, common) {
    var fromSchema = $routeParams.schema;
    $routeParams.schema = modelName;
    $routeParams.id = id;
    models.getModel(modelName, function(m) {
        var s = m.schema;
        var base = function(doc) {
            $scope.schema = {
                type: "object",
                title: modelName,
                action: doc ? "Edit" : "New",
                properties: s
            };
            var innerForm = common.processForm(m.config.form, false);
            $scope.form = innerForm;
            $scope.model = doc || {};
            if (!doc && models.getShard(fromSchema) && models.getShard(fromSchema).value) {
                $scope.model[models.getShard(fromSchema).key] = models.getShard(fromSchema).value;
            }
            dependsOn.apply($scope, modelName, $scope.model);
            $scope.submitForm = function(form, model) {
                $scope.$broadcast("schemaFormValidate");
                if (form.$valid) {
                    if ($scope.schema.action === "New") {
                        models.postDocument(modelName, model, function(response) {
                            if (response.status == "201") {
                                $scope.$broadcast("postedDocument", response.data);
                                $modalInstance.close("saved");
                            }
                        });
                    } else {
                        models.putDocument(modelName, id, model, function(response) {
                            if (response.status == "200") {
                                $scope.$broadcast("postedDocument", response.data);
                                $scope.$broadcast("puttedDocument", response.data);
                                $modalInstance.close("saved");
                            }
                        });
                    }
                } else {
                    alert("invalid form");
                }
            };
        };
        if (id) {
            models.getDocument(modelName, id, function(document) {
                base(document);
            });
        } else {
            base();
        }
    });
    $scope.cancel = function() {
        $modalInstance.dismiss("cancel");
    };
};

modalController.$inject = [ "$scope", "$http", "$modalInstance", "$routeParams", "models", "configs", "modelName", "id", "dependsOn", "common" ];

angular.module("schemaForm").directive("createUpdateModal", [ "$http", "$routeParams", "$rootScope", "$modal", "models", function($http, $routeParams, $rootScope, $modal, models) {
    return {
        restrict: "E",
        scope: true,
        require: [ "ngModel" ],
        link: function(scope, element, attrs, ngModel) {
            scope.open = function() {
                var modalInstance = $modal.open({
                    templateUrl: "createUpdateModal.html",
                    controller: modalController,
                    size: "lg",
                    resolve: {
                        modelName: function() {
                            return scope.$eval(attrs.ref);
                        },
                        id: function() {
                            if (attrs.type == "edit") return scope.$eval(attrs.ngModel); else return "";
                        }
                    }
                });
                modalInstance.result.then(function() {
                    $rootScope.$broadcast("refreshSelect2" + scope.$eval(attrs.ref));
                }, function() {
                    console.info("Modal dismissed at: " + new Date());
                });
            };
        }
    };
} ]);

angular.module("schemaForm").config([ "schemaFormProvider", "schemaFormDecoratorsProvider", "sfPathProvider", function(schemaFormProvider, schemaFormDecoratorsProvider, sfPathProvider) {
    var select2 = function(name, schema, options) {
        if (schema.ref) {
            var f = schemaFormProvider.stdFormObj(name, schema, options);
            f.key = options.path;
            f.type = "select2";
            f.query = schema.query;
            f.ref = schema.ref;
            f.shard = schema.shard;
            f.dependsOn = schema.dependsOn;
            options.lookup[sfPathProvider.stringify(options.path)] = f;
            return f;
        }
    };
    schemaFormProvider.defaults.string.unshift(select2);
    schemaFormProvider.defaults.object.unshift(select2);
    schemaFormDecoratorsProvider.addMapping("bootstrapDecorator", "select2", "directives/decorators/bootstrap/select2/select2.html");
    schemaFormDecoratorsProvider.createDirective("select2", "directives/decorators/bootstrap/select2/select2.html");
} ]);

angular.module("schemaForm").run([ "$templateCache", function($templateCache) {
    $templateCache.put("directives/decorators/bootstrap/simpleselect2/simple-select2.html", '<div class="form-group {{form.htmlClass}} schema-form-select"\n     ng-class="{\'has-error\': form.disableErrorState !== true && hasError(), \'has-success\': form.disableSuccessState !== true && hasSuccess(), \'has-feedback\': form.feedback !== false}">\n  <label class="control-label {{form.labelHtmlClass}}" ng-show="showTitle()">\n    {{form.title}}\n  </label>\n  <select simple-select\n\t      ng-model="$$value$$"\n          ng-model-options="form.ngModelOptions"\n          ng-disabled="form.readonly"\n          sf-changed="form"\n          class="form-control {{form.fieldHtmlClass}}"\n          schema-validate="form"\n          map="form.map"\n          dynmap="form.dynMap"\n          dynenum="form.dynEnum"\n          ng-options="item.value as item.name group by item.group for item in titleMap"\n          name="{{form.key.slice(-1)[0]}}">\n  </select>\n  <div class="help-block" sf-message="form.description"></div>\n</div>\n');
} ]);

angular.module("schemaForm").directive("simpleSelect", [ "$http", "$routeParams", "models", function($http, $routeParams, models) {
    return {
        restrict: "AE",
        require: [ "ngModel" ],
        link: function(scope, element, attrs, ngModel) {
            scope.titleMap = [];
            var map = scope.$eval(attrs.map);
            var dynMap = scope.$eval(attrs.dynmap);
            var dynEnum = scope.$eval(attrs.dynenum);
            if (dynEnum) {
                $http.get(dynEnum).then(function(res) {
                    var resultMap = {};
                    angular.forEach(res.data, function(elem) {
                        resultMap[elem] = elem;
                    });
                    setMap(resultMap);
                });
            } else if (dynMap) {
                $http.get(dynMap).then(function(res) {
                    setMap(res.data);
                });
            } else if (map) {
                setMap(map);
            }
            function setMap(map) {
                angular.forEach(Object.keys(map), function(key) {
                    var value = map[key];
                    var o = {};
                    o.value = key;
                    if (typeof value == "string") {
                        o.name = value;
                    } else {
                        o.name = value.name;
                        o.group = value.group;
                    }
                    scope.titleMap.push(o);
                });
            }
        }
    };
} ]);

angular.module("schemaForm").config([ "schemaFormProvider", "schemaFormDecoratorsProvider", "sfPathProvider", function(schemaFormProvider, schemaFormDecoratorsProvider, sfPathProvider) {
    var select2 = function(name, schema, options) {
        if (schema.map || schema.dynEnum || schema.dynMap) {
            var f = schemaFormProvider.stdFormObj(name, schema, options);
            f.key = options.path;
            f.type = "simpleselect2";
            f.map = schema.map;
            f.dynMap = schema.dynMap;
            f.dynEnum = schema.dynEnum;
            options.lookup[sfPathProvider.stringify(options.path)] = f;
            return f;
        }
    };
    schemaFormProvider.defaults.string.unshift(select2);
    schemaFormProvider.defaults.number.unshift(select2);
    schemaFormDecoratorsProvider.addMapping("bootstrapDecorator", "simpleselect2", "directives/decorators/bootstrap/simpleselect2/simple-select2.html");
    schemaFormDecoratorsProvider.createDirective("simpleselect2", "directives/decorators/bootstrap/simpleselect2/simple-select2.html");
} ]);

angular.module("schemaForm").run([ "$templateCache", function($templateCache) {
    $templateCache.put("directives/decorators/bootstrap/datetimepicker/datetimepicker.html", '<div class="form-group schema-form-{{form.type}} {{form.htmlClass}}">\r\n    \x3c!--<div ri-date date-picker="date" view="minutes" ng-model="$$value$$"></div>--\x3e\r\n    <label class="control-label" ng-show="showTitle()">{{form.title}}</label>\r\n\r\n    <div ri-date ng-model="$$value$$">\r\n        \x3c!--<div class="col-md-6">--\x3e\r\n            \x3c!--<div date-picker="modelDate" view="date" max-view="month" min-view="date"></div>--\x3e\r\n        \x3c!--</div>--\x3e\r\n        \x3c!--<div class="col-md-6">--\x3e\r\n            \x3c!--<div date-picker="modelHours" view="hours" max-view="hours"></div>--\x3e\r\n        \x3c!--</div>--\x3e\r\n        <input date-time ng-disabled="form.readonly" type="datetime" ng-model="modelDate" ng-change="{{updateDate(modelDate)}}" view="date" max-view="date" class="form-control" format="medium">\r\n    </div>\r\n</div>\r\n');
} ]);

angular.module("schemaForm").directive("riDate", [ "$http", "models", function($http, models) {
    return {
        restrict: "A",
        require: "ngModel",
        scope: false,
        link: function(scope, element, attrs, ngModel) {
            scope.modelDate = null;
            ngModel.$render = function() {
                if (ngModel.$viewValue) {
                    if (!scope.modelDate || scope.modelDate && scope.modelDate.toString() != ngModel.$viewValue) {
                        scope.modelDate = new Date(ngModel.$viewValue);
                    }
                }
            };
            scope.updateDate = function(m) {
                ngModel.$setViewValue(m);
                if (m == "" || !m) {
                    ngModel.$setViewValue(null);
                }
            };
        }
    };
} ]);

angular.module("schemaForm").config([ "schemaFormProvider", "schemaFormDecoratorsProvider", "sfPathProvider", function(schemaFormProvider, schemaFormDecoratorsProvider, sfPathProvider) {
    var mixed = function(name, schema, options) {
        if (schema.type === "string" && (schema.format === "datetimepicker" || schema.format === "date")) {
            var f = schemaFormProvider.stdFormObj(name, schema, options);
            f.key = options.path;
            f.type = "datetimepicker";
            f.format = schema.dateFormat;
            options.lookup[sfPathProvider.stringify(options.path)] = f;
            return f;
        }
    };
    schemaFormProvider.defaults.string.unshift(mixed);
    schemaFormDecoratorsProvider.addMapping("bootstrapDecorator", "datetimepicker", "directives/decorators/bootstrap/datetimepicker/datetimepicker.html");
    schemaFormDecoratorsProvider.createDirective("datetimepicker", "directives/decorators/bootstrap/datetimepicker/datetimepicker.html");
} ]);

angular.module("schemaForm").run([ "$templateCache", function($templateCache) {
    $templateCache.put("directives/decorators/bootstrap/new-imageinjector/new-imageinjector.html", '<link rel="stylesheet" href="//cdnjs.cloudflare.com/ajax/libs/jasny-bootstrap/3.1.3/css/jasny-bootstrap.min.css">\r\n<div class="form-group" ng-class="{\'has-error\': hasError()}">\r\n    <label class="control-label" ng-show="showTitle()">{{form.title}}</label>\r\n\r\n    <div class="input-group">\r\n        <div class="fileinput fileinput-new" data-provides="fileinput">\r\n            <div class="fileinput-new thumbnail" style="width: 200px; height: 150px;">\r\n                <img bk-new-image-view ng-model="$$value$$" ng-src="{{image}}" filename="$$value$$.image">\r\n            </div>\r\n            <p>{{$$value$$.originalName}}</p>\r\n\r\n            <div class="fileinput-preview fileinput-exists thumbnail"\r\n                 style="max-width: 200px; max-height: 150px;"></div>\r\n            <div>\r\n                <span class="btn btn-default btn-file">\r\n                    <span class="fileinput-new"><span class="glyphicon glyphicon-cloud-upload"></span></span> \x3c!-- upload image --\x3e\r\n                    <span class="fileinput-exists"><span class="glyphicon glyphicon-pencil"></span></span> \x3c!-- change image --\x3e\r\n                    <input bk-new-image-uploader\r\n                           type="file"\r\n                           name="image"\r\n                           path="form.path"\r\n                           index="{{arrayIndex}}"\r\n                           ngf-select="true" ng-model="myFiles" ngf-change="imageExists=false; onFileSelect($files)">\r\n                </span>\r\n                <a href=" #" class="btn btn-default fileinput-exists" data-dismiss="fileinput"><span\r\n                        class="glyphicon glyphicon-remove"></span></a> \x3c!-- discard --\x3e\r\n                <a ng-if="imageExists" download="{{$$value$$.image}}" ng-href="{{image}}" target="_self"\r\n                   class="btn btn-default"><span class="glyphicon glyphicon-cloud-download"></span></a>\r\n                \x3c!-- download --\x3e\r\n                <a ng-if="imageExists" ng-click="deleteImage(arrayIndex)" class="btn btn-default"><span\r\n                        class="glyphicon glyphicon-trash"></span></a> \x3c!-- delete from server --\x3e\r\n            </div>\r\n        </div>\r\n    </div>\r\n    <span class="help-block">{{ (hasError() && errorMessage(schemaError())) || form.description}}</span>\r\n</div>\r\n<script src="//cdnjs.cloudflare.com/ajax/libs/jasny-bootstrap/3.1.3/js/jasny-bootstrap.min.js"><\/script>');
} ]);

angular.module("schemaForm").directive("bkNewImageUploader", [ "$http", "$routeParams", "$timeout", "models", function($http, $routeParams, $timeout, models) {
    return {
        restrict: "A",
        scope: true,
        link: function(scope, element, attrs, ngModel) {
            var modelName = $routeParams.schema;
            scope.onFileSelect = function($files) {
                if ($files && $files.length > 0) {
                    scope.$on("postedDocument", function(event, args) {
                        if (scope.myFiles && scope.myFiles.length > 0) {
                            var file = scope.myFiles[0];
                            models.getModelConfig(modelName, function(config) {
                                var fieldName = scope.$eval(attrs.path);
                                models.uploadImage(modelName, args[config.id], fieldName, scope.arrayIndex, file, function(data) {});
                            });
                        }
                    });
                }
            };
        }
    };
} ]).directive("bkNewImageView", [ "$routeParams", "models", function($routeParams, models) {
    return {
        restrict: "A",
        require: "ngModel",
        link: function(scope, element, attrs, ngModel) {
            var defaultImage = "//dummyimage.com/200x150/cccccc/ffffff&text=Upload+Image";
            var id = $routeParams.id;
            var modelName = $routeParams.schema;
            scope.$watch(attrs.filename, function(value) {
                if (value) {
                    models.getImageUrl(modelName, id, value, function(url) {
                        scope.image = url;
                        scope.imageExists = true;
                    });
                } else {
                    scope.image = defaultImage;
                    scope.imageExists = false;
                }
            });
            scope.downloadImage = function() {
                console.log("TODO: Download image from model", modelName, "and id", id);
            };
            scope.deleteImage = function(index, model) {
                models.deleteImage(modelName, id, index, scope.$eval(attrs.filename), function() {
                    console.log("Image deleted");
                    ngModel.$setViewValue(null);
                });
            };
        }
    };
} ]);

angular.module("schemaForm").config([ "schemaFormProvider", "schemaFormDecoratorsProvider", "sfPathProvider", function(schemaFormProvider, schemaFormDecoratorsProvider, sfPathProvider) {
    var newImageInjector = function(name, schema, options) {
        if (schema.type === "image") {
            var pathArray = options.path.filter(function(e) {
                return e;
            });
            var path = pathArray.join(".");
            var f = schemaFormProvider.stdFormObj(name, schema, options);
            f.key = options.path;
            f.type = "image";
            f.index = "arrayIndex";
            f.path = path;
            options.lookup[sfPathProvider.stringify(options.path)] = f;
            return f;
        }
    };
    if (!schemaFormProvider.defaults.image) schemaFormProvider.defaults.image = [];
    schemaFormProvider.defaults.image.unshift(newImageInjector);
    schemaFormDecoratorsProvider.addMapping("bootstrapDecorator", "image", "directives/decorators/bootstrap/new-imageinjector/new-imageinjector.html");
    schemaFormDecoratorsProvider.createDirective("image", "directives/decorators/bootstrap/new-imageinjector/new-imageinjector.html");
} ]);

angular.module("schemaForm").run([ "$templateCache", function($templateCache) {
    $templateCache.put("directives/decorators/bootstrap/imageinjector/imageinjector.html", '<link rel="stylesheet" href="//cdnjs.cloudflare.com/ajax/libs/jasny-bootstrap/3.1.3/css/jasny-bootstrap.min.css">\r\n<div class="form-group" ng-class="{\'has-error\': hasError()}">\r\n    <label class="control-label" ng-show="showTitle()">{{form.title}}</label>\r\n\r\n    <div class="input-group">\r\n        <div class="fileinput fileinput-new" data-provides="fileinput">\r\n            <div class="fileinput-new thumbnail" style="width: 200px; height: 150px;">\r\n                <img bk-image-view ng-src="{{image}}" filename="$$value$$">\r\n            </div>\r\n            {{$$value$$}}\r\n            <div class="fileinput-preview fileinput-exists thumbnail"\r\n                 style="max-width: 200px; max-height: 150px;"></div>\r\n            <div>\r\n                <span class="btn btn-default btn-file">\r\n                    <span class="fileinput-new"><span class="glyphicon glyphicon-cloud-upload"></span></span> \x3c!-- upload image --\x3e\r\n                    <span class="fileinput-exists"><span class="glyphicon glyphicon-pencil"></span></span> \x3c!-- change image --\x3e\r\n                    <input bk-image-uploader\r\n                           type="file"\r\n                           name="image"\r\n                           path="form.path"\r\n                           index="{{arrayIndex}}"\r\n                           ngf-select="true" ng-model="myFiles" ngf-change="imageExists=false; onFileSelect($files)">\r\n                </span>\r\n                <a href=" #" class="btn btn-default fileinput-exists" data-dismiss="fileinput"><span class="glyphicon glyphicon-remove"></span></a> \x3c!-- discard --\x3e\r\n                <a ng-if="imageExists" download="{{$$value$$}}" ng-href="{{image}}" target="_self" class="btn btn-default"><span class="glyphicon glyphicon-cloud-download"></span></a> \x3c!-- download --\x3e\r\n                <a ng-if="imageExists" ng-click="deleteFile(arrayIndex)" class="btn btn-default"><span class="glyphicon glyphicon-trash"></span></a> \x3c!-- delete from server --\x3e\r\n            </div>\r\n        </div>\r\n    </div>\r\n    <span class="help-block">{{ (hasError() && errorMessage(schemaError())) || form.description}}</span>\r\n</div>\r\n<script src="//cdnjs.cloudflare.com/ajax/libs/jasny-bootstrap/3.1.3/js/jasny-bootstrap.min.js"><\/script>');
} ]);

angular.module("schemaForm").directive("bkImageUploader", [ "$http", "$routeParams", "$timeout", "models", function($http, $routeParams, $timeout, models) {
    return {
        restrict: "A",
        scope: true,
        link: function(scope, element, attrs, ngModel) {
            var modelName = $routeParams.schema;
            scope.onFileSelect = function($files) {
                if ($files && $files.length > 0) {
                    scope.$on("postedDocument", function(event, args) {
                        if (scope.myFiles && scope.myFiles.length > 0) {
                            var file = scope.myFiles[0];
                            models.getModelConfig(modelName, function(config) {
                                var fieldName = scope.$eval(attrs.path);
                                models.uploadImage(modelName, args[config.id], fieldName, scope.arrayIndex, file, function(data) {});
                            });
                        }
                    });
                }
            };
        }
    };
} ]).directive("bkImageView", [ "$routeParams", "models", function($routeParams, models) {
    return {
        restrict: "A",
        link: function(scope, element, attrs, ngModel) {
            var defaultImage = "//dummyimage.com/200x150/cccccc/ffffff&text=Upload+Image";
            var id = $routeParams.id;
            var modelName = $routeParams.schema;
            scope.$watch(attrs.filename, function(value) {
                if (value) {
                    models.getImageUrl(modelName, id, value, function(url) {
                        scope.image = url;
                        scope.imageExists = true;
                    });
                } else {
                    scope.image = defaultImage;
                    scope.imageExists = false;
                }
            });
            scope.downloadImage = function() {
                console.log("TODO: Download image from model", modelName, "and id", id);
            };
            scope.deleteImage = function(index) {
                models.deleteImage(modelName, id, index, scope.$eval(attrs.filename), function() {
                    console.log("Image deleted");
                    scope.image = defaultImage;
                });
            };
        }
    };
} ]);

angular.module("schemaForm").config([ "schemaFormProvider", "schemaFormDecoratorsProvider", "sfPathProvider", function(schemaFormProvider, schemaFormDecoratorsProvider, sfPathProvider) {
    var imageinjector = function(name, schema, options) {
        if (schema.type === "string" && schema.format === "image") {
            var f = schemaFormProvider.stdFormObj(name, schema, options);
            f.key = options.path;
            f.type = "imageinjector";
            f.index = "arrayIndex";
            f.path = schema.path;
            options.lookup[sfPathProvider.stringify(options.path)] = f;
            return f;
        }
    };
    schemaFormProvider.defaults.string.unshift(imageinjector);
    schemaFormDecoratorsProvider.addMapping("bootstrapDecorator", "imageinjector", "directives/decorators/bootstrap/imageinjector/imageinjector.html");
    schemaFormDecoratorsProvider.createDirective("imageinjector", "directives/decorators/bootstrap/imageinjector/imageinjector.html");
} ]);

angular.module("schemaForm").run([ "$templateCache", function($templateCache) {
    $templateCache.put("directives/decorators/bootstrap/galleryimage/galleryimage.html", '\x3c!--<link rel="stylesheet" href="//cdnjs.cloudflare.com/ajax/libs/jasny-bootstrap/3.1.3/css/jasny-bootstrap.min.css">--\x3e\r\n<div class="form-group {{form.htmlClass}}" ng-class="{\'has-error\': hasError()}">\r\n    <label class="control-label" ng-show="showTitle()">{{form.title}}</label>\r\n\r\n    <div class="input-group">\r\n        <a ri-single-gallery-view ng-click="openGallery()" ng-model="$$value$$" alt="Click to open Gallery">\r\n            <img ng-src="{{image}}" error="{{defaultErrorImage}}" class="img-thumbnail" width="200" height="150">\r\n        </a>\r\n        <p>{{$$value$$}}</p>\r\n        <div>\r\n            <a ng-if="imageExists" download="{{$$value$$}}" ng-href="{{image}}" target="_self"\r\n               class="btn btn-default"><span class="glyphicon glyphicon-cloud-download"></span></a>\r\n            \x3c!-- download --\x3e\r\n            <a ng-if="imageExists" ng-click="delete()" class="btn btn-default"><span\r\n                    class="glyphicon glyphicon-trash"></span></a> \x3c!-- delete from server --\x3e\r\n        </div>\r\n    </div>\r\n    <span class="help-block">{{ (hasError() && errorMessage(schemaError())) || form.description}}</span>\r\n</div>\r\n<script type="text/ng-template" id="galleryImage.html">\r\n\r\n    <div class="modal-header">\r\n        <h3 class="modal-title">Gallery</h3>\r\n    </div>\r\n    <div class="modal-body">\r\n        <tinyvision ng-model="ngModel"></tinyvision>\r\n    </div>\r\n    <div class="modal-footer">\r\n        <button class="btn btn-default" ng-click="cancel()">Cancel</button>\r\n        <button class="btn btn-default" ng-click="select()">Select</button>\r\n    </div>\r\n    <style>\r\n        .modal-body #tinyvision .tv-toolbar {\r\n            position: absolute;\r\n        }\r\n\r\n        .modal-body #tinyvision .tv-items {\r\n            margin: 50px 0 0 0;\r\n            width: 100%;\r\n        }\r\n    </style>\r\n<\/script>\r\n');
} ]);

angular.module("schemaForm").directive("riSingleGalleryView", [ "$routeParams", "models", "$modal", function($routeParams, models, $modal) {
    return {
        restrict: "A",
        require: "ngModel",
        link: function(scope, element, attrs, ngModel) {
            var defaultImage = "images/open_gallery.png";
            scope.defaultErrorImage = "images/image_not_found.png";
            ngModel.$render = function(image) {
                if (image) {
                    ngModel.$setViewValue(image);
                } else if (image === "") {
                    ngModel.$setViewValue("");
                }
                scope.image = ngModel.$viewValue + random() || defaultImage;
                scope.imageExists = ngModel.$viewValue || false;
            };
            scope.delete = function() {
                ngModel.$render("");
            };
            scope.openGallery = function() {
                $modal.open({
                    templateUrl: "galleryImage.html",
                    controller: "SingleItemGalleryModalCtrl",
                    size: "lg",
                    resolve: {
                        ngModal: function() {
                            return ngModel;
                        }
                    }
                }).result.then(function(selectedImage) {
                    ngModel.$render(selectedImage);
                });
            };
            angular.element(element).find("img").bind("error", function() {
                angular.element(this).attr("src", scope.defaultErrorImage);
            });
            function random() {
                return "?time=" + Date.now();
            }
        }
    };
} ]).controller("SingleItemGalleryModalCtrl", [ "$scope", "$modalInstance", function($scope, $modalInstance) {
    $scope.cancel = function() {
        $modalInstance.dismiss("cancel");
    };
    $scope.select = function() {
        $modalInstance.close($scope.ngModel);
    };
} ]);

angular.module("schemaForm").config([ "schemaFormProvider", "schemaFormDecoratorsProvider", "sfPathProvider", function(schemaFormProvider, schemaFormDecoratorsProvider, sfPathProvider) {
    var gallery = function(name, schema, options) {
        if (schema.type === "gallery") {
            var f = schemaFormProvider.stdFormObj(name, schema, options);
            f.key = options.path;
            f.type = "gallery";
            f.index = "arrayIndex";
            f.path = schema.path;
            options.lookup[sfPathProvider.stringify(options.path)] = f;
            return f;
        }
    };
    if (!schemaFormProvider.defaults.gallery) schemaFormProvider.defaults.gallery = [];
    schemaFormProvider.defaults.gallery.unshift(gallery);
    schemaFormDecoratorsProvider.addMapping("bootstrapDecorator", "gallery", "directives/decorators/bootstrap/galleryimage/galleryimage.html");
    schemaFormDecoratorsProvider.createDirective("gallery", "directives/decorators/bootstrap/galleryimage/galleryimage.html");
} ]);

angular.module("schemaForm").run([ "$templateCache", function($templateCache) {
    $templateCache.put("directives/decorators/bootstrap/galleryfile/galleryfile.html", '<link rel="stylesheet" href="//cdnjs.cloudflare.com/ajax/libs/jasny-bootstrap/3.1.3/css/jasny-bootstrap.min.css">\r\n<div class="form-group" ng-class="{\'has-error\': hasError()}">\r\n    <label class="control-label" ng-show="showTitle()">{{form.title}}</label>\r\n\r\n    <div class="input-group">\r\n        <div class="fileinput fileinput-new" data-provides="fileinput">\r\n            <div class="fileinput-new thumbnail" style="width: 200px; height: 150px;">\r\n                <img ng-if="sampleImage" ng-model="$$value$$" ri-file-view ng-show="sampleImage" ng-src="{{sampleImage}}">\r\n                <a ri-file-view filename="$$value$$" href="{{$$value$$}}" ng-model="$$value$$">{{$$value$$}}</a>\r\n            </div>\r\n            <div class="fileinput-preview fileinput-exists thumbnail"\r\n                 style="max-width: 200px; max-height: 150px;"></div>\r\n            <div ri-gallery-file-uploader ng-model="$$value$$">\r\n                <span class="btn btn-default btn-file">\r\n                    <span class="fileinput-new"><span class="glyphicon glyphicon-cloud-upload"></span></span>\r\n                    \x3c!-- upload file --\x3e\r\n                    <span class="fileinput-exists"><span class="glyphicon glyphicon-pencil"></span></span>\r\n                    \x3c!-- change file --\x3e\r\n                    <input ri-gallery-file-uploader\r\n                           type="file"\r\n                           name="file"\r\n                           path="form.path"\r\n                           index="{{arrayIndex}}"\r\n                           ngf-select="true" ng-model="myFiles" ngf-change="fileExists=false; onFileSelect($files)">\r\n                </span>\r\n                <a href=" #" class="btn btn-default fileinput-exists" data-dismiss="fileinput"><span\r\n                        class="glyphicon glyphicon-remove"></span></a> \x3c!-- discard --\x3e\r\n                <a ng-if="fileExists" download="{{$$value$$}}" ng-href="{{file}}" target="_self"\r\n                   class="btn btn-default"><span class="glyphicon glyphicon-cloud-download"></span></a>\r\n                \x3c!-- download --\x3e\r\n                <a ng-if="fileExists" ng-click="deleteFile(arrayIndex)" class="btn btn-default"><span\r\n                        class="glyphicon glyphicon-trash"></span></a> \x3c!-- delete from server --\x3e\r\n            </div>\r\n        </div>\r\n    </div>\r\n    <span class="help-block">{{ (hasError() && errorMessage(schemaError())) || form.description}}</span>\r\n</div>\r\n<script src="//cdnjs.cloudflare.com/ajax/libs/jasny-bootstrap/3.1.3/js/jasny-bootstrap.min.js"><\/script>');
} ]);

angular.module("schemaForm").directive("riGalleryFileUploader", [ "$http", "$routeParams", "$timeout", "models", function($http, $routeParams, $timeout, models) {
    return {
        restrict: "A",
        require: "ngModel",
        link: function(scope, element, attrs, ngModel) {
            scope.onFileSelect = function($files) {
                if ($files && $files.length > 0) {
                    if (scope.myFiles && scope.myFiles.length > 0) {
                        var file = scope.myFiles[0];
                        models.uploadToGallery(file, function(data) {
                            ngModel.$render(data[0]);
                        });
                    }
                }
            };
            ngModel.$render = function(image) {
                if (image) {
                    ngModel.$setViewValue(image);
                } else if (image === "") {
                    ngModel.$setViewValue("");
                }
            };
        }
    };
} ]).directive("riFileView", [ "$routeParams", "models", function($routeParams, models) {
    return {
        restrict: "A",
        require: "ngModel",
        link: function(scope, element, attrs, ngModel) {
            var defaultImageForFile = "//dummyimage.com/200x150/cccccc/ffffff&text=Upload+File";
            var id = $routeParams.id;
            var modelName = $routeParams.schema;
            scope.$watch(attrs.filename, function(value) {
                if (value) {
                    scope.galleryPath = models.getGalleryPath();
                    scope.file = models.getGalleryPath() + value;
                    scope.fileExists = true;
                } else {
                    scope.sampleImage = defaultImageForFile;
                    scope.fileExists = false;
                }
                scope.downloadImage = function() {
                    console.log("TODO: Download file from model", modelName, "and id", id);
                };
                scope.deleteFile = function() {
                    models.galleryDelete(value, function() {
                        ngModel.$render("");
                    });
                };
            });
            ngModel.$render = function(image) {
                if (image) {
                    ngModel.$setViewValue(image);
                } else if (image === "") {
                    scope.sampleImage = defaultImageForFile;
                    ngModel.$setViewValue("");
                }
            };
        }
    };
} ]);

angular.module("schemaForm").config([ "schemaFormProvider", "schemaFormDecoratorsProvider", "sfPathProvider", function(schemaFormProvider, schemaFormDecoratorsProvider, sfPathProvider) {
    var file = function(name, schema, options) {
        if (schema.type === "gallery" && schema.format === "file") {
            var f = schemaFormProvider.stdFormObj(name, schema, options);
            f.key = options.path;
            f.type = "file";
            f.index = "arrayIndex";
            f.path = schema.path;
            options.lookup[sfPathProvider.stringify(options.path)] = f;
            return f;
        }
    };
    if (!schemaFormProvider.defaults.gallery) schemaFormProvider.defaults.gallery = [];
    schemaFormProvider.defaults.gallery.unshift(file);
    schemaFormDecoratorsProvider.addMapping("bootstrapDecorator", "file", "directives/decorators/bootstrap/galleryfile/galleryfile.html");
    schemaFormDecoratorsProvider.createDirective("file", "directives/decorators/bootstrap/galleryfile/galleryfile.html");
} ]);

angular.module("schemaForm").run([ "$templateCache", function($templateCache) {
    $templateCache.put("directives/decorators/bootstrap/geojson/geojson.html", '<link rel="stylesheet" href="css/leaflet/dist/leaflet.css"/>\r\n<div class="form-group" ng-class="{\'has-error\': hasError()}">\r\n    <label class="control-label" ng-show="showTitle()">{{form.title}}</label>\r\n    <leaflet id="map" lf-map ng-model="$$value$$" width="100%" lf-center="center || {}" markers="markers" height="480px"></leaflet>\r\n    \x3c!--<leaflet id="map" width="100%" height="480px"></leaflet>--\x3e\r\n    <span class="help-block">{{ (hasError() && errorMessage(schemaError())) || form.description}}</span>\r\n</div>\r\n');
} ]);

(function() {
    angular.module("schemaForm").directive("lfMap", [ "$http", "$routeParams", "models", "leafletData", "$window", "$sce", function($http, $routeParams, models, leafletData, $window, $sce) {
        return {
            restrict: "AE",
            require: "ngModel",
            priority: 1,
            controller: [ "$scope", function($scope) {
                $scope.center = {
                    lat: 41.2757772,
                    lng: 1.9888791,
                    zoom: 8
                };
            } ],
            link: function(scope, element, attrs, ngModel) {
                if (ngModel) {
                    ngModel.$render = function() {
                        if (!ngModel.$viewValue) {
                            return;
                        }
                        scope.center = {
                            lat: ngModel.$viewValue.coordinates[1],
                            lng: ngModel.$viewValue.coordinates[0],
                            zoom: 15
                        };
                        scope.markers = {
                            mainMarker: {
                                lat: ngModel.$viewValue.coordinates[1],
                                lng: ngModel.$viewValue.coordinates[0],
                                focus: true
                            }
                        };
                    };
                }
                $window.dispatchEvent(new Event("resize"));
            }
        };
    } ]);
})();

(function() {
    angular.module("schemaForm").config([ "schemaFormProvider", "schemaFormDecoratorsProvider", "sfPathProvider", function(schemaFormProvider, schemaFormDecoratorsProvider, sfPathProvider) {
        var geojson = function(name, schema, options) {
            if (schema.type == "geojson") {
                var f = schemaFormProvider.stdFormObj(name, schema, options);
                f.key = options.path;
                f.type = "geojson";
                options.lookup[sfPathProvider.stringify(options.path)] = f;
                return f;
            }
        };
        if (!schemaFormProvider.defaults.geojson) schemaFormProvider.defaults.geojson = [];
        schemaFormProvider.defaults.geojson.unshift(geojson);
        schemaFormDecoratorsProvider.addMapping("bootstrapDecorator", "geojson", "directives/decorators/bootstrap/geojson/geojson.html");
        schemaFormDecoratorsProvider.createDirective("geojson", "directives/decorators/bootstrap/geojson/geojson.html");
    } ]);
})();

angular.module("schemaForm").run([ "$templateCache", function($templateCache) {
    $templateCache.put("directives/decorators/bootstrap/fileinjector/fileinjector.html", '<link rel="stylesheet" href="//cdnjs.cloudflare.com/ajax/libs/jasny-bootstrap/3.1.3/css/jasny-bootstrap.min.css">\r\n<div class="form-group" ng-class="{\'has-error\': hasError()}">\r\n    <label class="control-label" ng-show="showTitle()">{{form.title}}</label>\r\n\r\n    <div class="input-group">\r\n        <div class="fileinput fileinput-new" data-provides="fileinput">\r\n            <div class="fileinput-new thumbnail" style="width: 200px; height: 150px;">\r\n                <img bk-file-view ng-src="{{file}}" filename="$$value$$">\r\n            </div>\r\n            {{$$value$$}}\r\n            <div class="fileinput-preview fileinput-exists thumbnail"\r\n                 style="max-width: 200px; max-height: 150px;"></div>\r\n            <div>\r\n                <span class="btn btn-default btn-file">\r\n                    <span class="fileinput-new"><span class="glyphicon glyphicon-cloud-upload"></span></span> \x3c!-- upload file --\x3e\r\n                    <span class="fileinput-exists"><span class="glyphicon glyphicon-pencil"></span></span> \x3c!-- change file --\x3e\r\n                    <input bk-file-uploader\r\n                           type="file"\r\n                           name="file"\r\n                           path="form.path"\r\n                           index="{{arrayIndex}}"\r\n                           ngf-select="true" ng-model="myFiles" ngf-change="fileExists=false; onFileSelect($files)">\r\n                </span>\r\n                <a href=" #" class="btn btn-default fileinput-exists" data-dismiss="fileinput"><span class="glyphicon glyphicon-remove"></span></a> \x3c!-- discard --\x3e\r\n                <a ng-if="fileExists" download="{{$$value$$}}" ng-href="{{file}}" target="_self" class="btn btn-default"><span class="glyphicon glyphicon-cloud-download"></span></a> \x3c!-- download --\x3e\r\n                <a ng-if="fileExists" ng-click="deleteFile(arrayIndex)" class="btn btn-default"><span class="glyphicon glyphicon-trash"></span></a> \x3c!-- delete from server --\x3e\r\n            </div>\r\n        </div>\r\n    </div>\r\n    <span class="help-block">{{ (hasError() && errorMessage(schemaError())) || form.description}}</span>\r\n</div>\r\n<script src="//cdnjs.cloudflare.com/ajax/libs/jasny-bootstrap/3.1.3/js/jasny-bootstrap.min.js"><\/script>');
} ]);

angular.module("schemaForm").directive("bkFileUploader", [ "$http", "$routeParams", "$timeout", "models", function($http, $routeParams, $timeout, models) {
    return {
        restrict: "A",
        scope: true,
        link: function(scope, element, attrs, ngModel) {
            var modelName = $routeParams.schema;
            scope.onFileSelect = function($files) {
                if ($files && $files.length > 0) {
                    scope.$on("postedDocument", function(event, args) {
                        if (scope.myFiles && scope.myFiles.length > 0) {
                            var file = scope.myFiles[0];
                            models.getModelConfig(modelName, function(config) {
                                var fieldName = scope.$eval(attrs.path);
                                models.uploadFile(modelName, args[config.id], fieldName, scope.arrayIndex, file, function(data) {});
                            });
                        }
                    });
                }
            };
        }
    };
} ]).directive("bkFileView", [ "$routeParams", "models", function($routeParams, models) {
    return {
        restrict: "A",
        link: function(scope, element, attrs, ngModel) {
            var defaultImageForFile = "//dummyimage.com/200x150/cccccc/ffffff&text=Upload+File";
            var id = $routeParams.id;
            var modelName = $routeParams.schema;
            scope.$watch(attrs.filename, function(value) {
                if (value) {
                    models.getFileUrl(modelName, id, value, function(url) {
                        scope.file = url;
                        scope.fileExists = true;
                    });
                } else {
                    scope.file = defaultImageForFile;
                    scope.fileExists = false;
                }
            });
            scope.downloadImage = function() {
                console.log("TODO: Download file from model", modelName, "and id", id);
            };
            scope.deleteFile = function(index) {
                models.deleteFile(modelName, id, index, scope.$eval(attrs.filename), function() {
                    console.log("File deleted");
                    scope.file = defaultImageForFile;
                });
            };
        }
    };
} ]);

angular.module("schemaForm").config([ "schemaFormProvider", "schemaFormDecoratorsProvider", "sfPathProvider", function(schemaFormProvider, schemaFormDecoratorsProvider, sfPathProvider) {
    var fileinjector = function(name, schema, options) {
        if (schema.type === "string" && schema.format === "file") {
            var f = schemaFormProvider.stdFormObj(name, schema, options);
            f.key = options.path;
            f.type = "fileinjector";
            f.index = "arrayIndex";
            f.path = schema.path;
            options.lookup[sfPathProvider.stringify(options.path)] = f;
            return f;
        }
    };
    schemaFormProvider.defaults.string.unshift(fileinjector);
    schemaFormDecoratorsProvider.addMapping("bootstrapDecorator", "fileinjector", "directives/decorators/bootstrap/fileinjector/fileinjector.html");
    schemaFormDecoratorsProvider.createDirective("fileinjector", "directives/decorators/bootstrap/fileinjector/fileinjector.html");
} ]);

angular.module("schemaForm").run([ "$templateCache", function($templateCache) {
    $templateCache.put("directives/decorators/bootstrap/mixed/mixed.html", '<link rel="stylesheet" href="dist/css/codemirror/theme/monokai.css"/>\r\n<div class="form-group {{form.htmlClass}}" ng-class="{\'has-error\': hasError()}">\r\n    <label class="control-label" ng-show="showTitle()">{{form.title}}</label>\r\n    <ui-codemirror ui-codemirror-opts="editorOptions" ng-model="$$value$$" ui-codemirror="{ onLoad : codemirrorLoaded }"></ui-codemirror>\r\n    <span class="help-block">{{ (hasError() && errorMessage(schemaError())) || form.description}}</span>\r\n</div>\r\n<script src="dist/extra/codemirror/javascript.js"><\/script>\r\n');
} ]);

angular.module("schemaForm").directive("uiCodemirror", [ "$http", "$routeParams", "models", function($http, $routeParams, models) {
    return {
        restrict: "AE",
        require: "ngModel",
        link: function(scope, element, attrs, ngModel) {
            scope.editorOptions = {
                lineNumbers: true,
                mode: "application/json",
                foldGutter: {
                    rangeFinder: new CodeMirror.fold.combine(CodeMirror.fold.brace)
                },
                matchBrackets: true,
                gutters: [ "CodeMirror-foldgutter" ]
            };
        }
    };
} ]);

angular.module("ui.codemirror", []).constant("uiCodemirrorConfig", {}).directive("uiCodemirror", [ "uiCodemirrorConfig", function(uiCodemirrorConfig) {
    return {
        restrict: "EA",
        require: "?ngModel",
        priority: 1,
        compile: function compile() {
            if (angular.isUndefined(window.CodeMirror)) {
                throw new Error("ui-codemirror need CodeMirror to work... (o rly?)");
            }
            return function postLink(scope, iElement, iAttrs, ngModel) {
                var options, opts, codeMirror, initialTextValue;
                initialTextValue = iElement.text();
                options = uiCodemirrorConfig.codemirror || {};
                opts = angular.extend({
                    value: initialTextValue
                }, options, scope.$eval(iAttrs.uiCodemirror), scope.$eval(iAttrs.uiCodemirrorOpts));
                if (iElement[0].tagName === "TEXTAREA") {
                    codeMirror = window.CodeMirror.fromTextArea(iElement[0], opts);
                } else {
                    iElement.html("");
                    codeMirror = new window.CodeMirror(function(cm_el) {
                        iElement.append(cm_el);
                    }, opts);
                }
                if (iAttrs.uiCodemirror || iAttrs.uiCodemirrorOpts) {
                    var codemirrorDefaultsKeys = Object.keys(window.CodeMirror.defaults);
                    scope.$watch(iAttrs.uiCodemirror || iAttrs.uiCodemirrorOpts, function updateOptions(newValues, oldValue) {
                        if (!angular.isObject(newValues)) {
                            return;
                        }
                        codemirrorDefaultsKeys.forEach(function(key) {
                            if (newValues.hasOwnProperty(key)) {
                                if (oldValue && newValues[key] === oldValue[key]) {
                                    return;
                                }
                                codeMirror.setOption(key, newValues[key]);
                            }
                        });
                    }, true);
                }
                if (ngModel) {
                    ngModel.$formatters.push(function(value) {
                        if (angular.isUndefined(value) || value === null) {
                            return "";
                        } else if (angular.isObject(value) || angular.isArray(value)) {
                            return JSON.stringify(value);
                        }
                        return value;
                    });
                    ngModel.$render = function() {
                        var safeViewValue = ngModel.$viewValue || "";
                        codeMirror.setValue(safeViewValue);
                    };
                    codeMirror.on("change", function(instance) {
                        var newValue = instance.getValue();
                        if (newValue !== ngModel.$viewValue) {
                            scope.$apply(function() {
                                try {
                                    var parsed = JSON.parse(newValue);
                                    ngModel.$setViewValue(parsed);
                                } catch (e) {}
                            });
                        }
                    });
                }
                if (iAttrs.uiRefresh) {
                    scope.$watch(iAttrs.uiRefresh, function(newVal, oldVal) {
                        if (newVal !== oldVal) {
                            codeMirror.refresh();
                        }
                    });
                }
                scope.$on("CodeMirror", function(event, callback) {
                    if (angular.isFunction(callback)) {
                        callback(codeMirror);
                    } else {
                        throw new Error("the CodeMirror event requires a callback function");
                    }
                });
                if (angular.isFunction(opts.onLoad)) {
                    opts.onLoad(codeMirror);
                }
            };
        }
    };
} ]);

angular.module("schemaForm").config([ "schemaFormProvider", "schemaFormDecoratorsProvider", "sfPathProvider", function(schemaFormProvider, schemaFormDecoratorsProvider, sfPathProvider) {
    var mixed = function(name, schema, options) {
        if (schema.type == "object" && !schema.ref && !schema.format && schema.mixed) {
            var f = schemaFormProvider.stdFormObj(name, schema, options);
            f.key = options.path;
            f.type = "mixed";
            options.lookup[sfPathProvider.stringify(options.path)] = f;
            return f;
        }
    };
    schemaFormProvider.defaults.object.unshift(mixed);
    schemaFormDecoratorsProvider.addMapping("bootstrapDecorator", "mixed", "directives/decorators/bootstrap/mixed/mixed.html");
    schemaFormDecoratorsProvider.createDirective("mixed", "directives/decorators/bootstrap/mixed/mixed.html");
} ]);

angular.module("schemaForm").run([ "$templateCache", function($templateCache) {
    $templateCache.put("directives/decorators/bootstrap/button/button.html", '<div class="form-group {{form.htmlClass}}">\r\n    <button bk-button type="button" ng-click="click()" ng-show="showTitle()" class="btn">{{form.title}}</button>\r\n</div>\r\n');
} ]);

angular.module("schemaForm").directive("bkButton", [ "$http", "models", function($http, models) {
    return {
        restrict: "A",
        link: function(scope, element, attrs, ngModel) {
            var form = scope.form;
            scope.click = function() {
                scope.$emit("bkButton", form);
            };
        }
    };
} ]);

angular.module("schemaForm").config([ "schemaFormProvider", "schemaFormDecoratorsProvider", "sfPathProvider", function(schemaFormProvider, schemaFormDecoratorsProvider, sfPathProvider) {
    var mixed = function(name, schema, options) {
        if (schema.type === "string" && schema.format === "button") {
            var f = schemaFormProvider.stdFormObj(name, schema, options);
            f.key = options.path;
            f.type = "button";
            f.action = schema.action;
            if (f.action == "api") {
                f.method = schema.method;
                f.url = schema.url;
                f.params = schema.params;
            } else if (f.action == "function") {
                f.func = schema.func;
            }
            f.function = schema.onClick;
            options.lookup[sfPathProvider.stringify(options.path)] = f;
            return f;
        }
    };
    schemaFormProvider.defaults.string.unshift(mixed);
    schemaFormDecoratorsProvider.addMapping("bootstrapDecorator", "button", "directives/decorators/bootstrap/button/button.html");
    schemaFormDecoratorsProvider.createDirective("button", "directives/decorators/bootstrap/button/button.html");
} ]);

angular.module("schemaForm").run([ "$templateCache", function($templateCache) {
    $templateCache.put("directives/decorators/bootstrap/textarea/textarea.html", '<div class="form-group has-feedback" ng-class="{\'has-error\': hasError(), \'has-success\': hasSuccess()}">\n    <label ng-show="showTitle()">{{form.title}}</label>\n    <textarea class="form-control"\n              sf-changed="form"\n              placeholder="{{form.placeholder}}"\n              ng-disabled="form.readonly"\n              ng-model="$$value$$"\n              ng-model-options="form.ngModelOptions"\n              schema-validate="form"\n              rows="{{form.rows}}"></textarea>\n    <span class="help-block">{{ (hasError() && errorMessage(schemaError())) || form.description}}</span>\n</div>');
} ]);

angular.module("schemaForm").config([ "schemaFormProvider", "schemaFormDecoratorsProvider", "sfPathProvider", function(schemaFormProvider, schemaFormDecoratorsProvider, sfPathProvider) {
    var mixed = function(name, schema, options) {
        if (schema.type === "string" && schema.format === "textarea") {
            var f = schemaFormProvider.stdFormObj(name, schema, options);
            f.key = options.path;
            f.type = "textarea";
            f.rows = schema.rows;
            options.lookup[sfPathProvider.stringify(options.path)] = f;
            return f;
        }
    };
    schemaFormProvider.defaults.string.unshift(mixed);
    schemaFormDecoratorsProvider.addMapping("bootstrapDecorator", "textarea", "directives/decorators/bootstrap/textarea/textarea.html");
    schemaFormDecoratorsProvider.createDirective("textarea", "directives/decorators/bootstrap/textarea/textarea.html");
} ]);

angular.module("schemaForm").run([ "$templateCache", function($templateCache) {
    $templateCache.put("directives/decorators/bootstrap/password/password.html", '<div class="form-group has-feedback {{form.divStyle}}" ng-class="{\'has-error\': hasError(), \'has-success\': hasSuccess()}">\r\n    <label ng-show="showTitle()">{{form.title}}</label>\r\n    <input type="password" class="form-control {{form.style}}"\r\n              sf-changed="form"\r\n              placeholder="{{form.placeholder}}"\r\n              ng-disabled="form.readonly"\r\n              ng-model="$$value$$"\r\n              ng-model-options="form.ngModelOptions"\r\n              schema-validate="form">\r\n    <span class="help-block">{{ (hasError() && errorMessage(schemaError())) || form.description}}</span>\r\n</div>');
} ]);

angular.module("schemaForm").config([ "schemaFormProvider", "schemaFormDecoratorsProvider", "sfPathProvider", function(schemaFormProvider, schemaFormDecoratorsProvider, sfPathProvider) {
    var mixed = function(name, schema, options) {
        if (schema.type === "string" && schema.format === "password") {
            var f = schemaFormProvider.stdFormObj(name, schema, options);
            f.key = options.path;
            f.type = "password";
            options.lookup[sfPathProvider.stringify(options.path)] = f;
            return f;
        }
    };
    schemaFormProvider.defaults.string.unshift(mixed);
    schemaFormDecoratorsProvider.addMapping("bootstrapDecorator", "password", "directives/decorators/bootstrap/password/password.html");
    schemaFormDecoratorsProvider.createDirective("password", "directives/decorators/bootstrap/password/password.html");
} ]);

angular.module("schemaForm").run([ "$templateCache", function($templateCache) {
    $templateCache.put("directives/decorators/bootstrap/seconds/seconds.html", '<fieldset ng-disabled="form.readonly" class="schema-form-fieldset {{form.htmlClass}}">\n    <legend ng-show="form.title">{{ form.title }}</legend>\n\n    \x3c!--<sf-decorator>--\x3e\n    <div class="form-group schema-form-number col-xs-3 has-success has-feedback">\n        <label>Minutes</label>\n        <input type="number" min="0" class="form-control" ng-model="timeMinutes"/>\n            <span ng-if="form.feedback !== false" class="form-control-feedback ng-scope glyphicon glyphicon-ok"\n                  ng-class="evalInScope(form.feedback) || {\'glyphicon\': true, \'glyphicon-ok\': hasSuccess(), \'glyphicon-remove\': hasError() }"\n                  aria-hidden="true"></span>\n    </div>\n    \x3c!--</sf-decorator>--\x3e\n\n    \x3c!--<sf-decorator class="ng-scope">--\x3e\n    <div class="form-group schema-form-number col-xs-3 has-success has-feedback">\n        <label>Seconds</label>\n        <input type="number" min="0" max="59" class="form-control" ng-model="timeSeconds"/>\n            <span ng-if="form.feedback !== false" class="form-control-feedback ng-scope glyphicon glyphicon-ok"\n                  ng-class="evalInScope(form.feedback) || {\'glyphicon\': true, \'glyphicon-ok\': hasSuccess(), \'glyphicon-remove\': hasError() }"\n                  aria-hidden="true"></span>\n    </div>\n    \x3c!--</sf-decorator>--\x3e\n    <div class="help-block"\n         ng-show="(hasError() && errorMessage(schemaError())) || form.description"\n         ng-bind-html="(hasError() && errorMessage(schemaError())) || form.description"></div>\n</fieldset>\n\n<input bk-seconds ng-model="$$value$$" type="hidden"/>');
} ]);

angular.module("schemaForm").directive("bkSeconds", [ "$http", "$routeParams", "models", function($http, $routeParams, models) {
    return {
        restrict: "AE",
        require: "ngModel",
        link: function(scope, element, attrs, ngModel) {
            ngModel.$render = function() {
                if (ngModel.$viewValue != undefined) {
                    scope.timeMinutes = Math.floor(ngModel.$viewValue / 60);
                    scope.timeSeconds = ngModel.$viewValue % 60;
                } else {
                    scope.timeMinutes = 0;
                    scope.timeSeconds = 0;
                }
            };
            scope.$watch("timeMinutes", function(newval) {
                if (newval != undefined) ngModel.$setViewValue(newval * 60 + scope.timeSeconds);
            });
            scope.$watch("timeSeconds", function(newval) {
                if (newval != undefined) ngModel.$setViewValue(scope.timeMinutes * 60 + newval);
            });
        }
    };
} ]);

angular.module("schemaForm").config([ "schemaFormProvider", "schemaFormDecoratorsProvider", "sfPathProvider", function(schemaFormProvider, schemaFormDecoratorsProvider, sfPathProvider) {
    var seconds = function(name, schema, options) {
        if (schema.type === "number" && schema.format === "time-seconds") {
            var f = schemaFormProvider.stdFormObj(name, schema, options);
            f.key = options.path;
            f.type = "seconds";
            options.lookup[sfPathProvider.stringify(options.path)] = f;
            return f;
        }
    };
    schemaFormProvider.defaults.number.unshift(seconds);
    schemaFormDecoratorsProvider.addMapping("bootstrapDecorator", "seconds", "directives/decorators/bootstrap/seconds/seconds.html");
    schemaFormDecoratorsProvider.createDirective("seconds", "directives/decorators/bootstrap/seconds/seconds.html");
} ]);

angular.module("schemaForm").run([ "$templateCache", function($templateCache) {
    $templateCache.put("directives/decorators/bootstrap/multiselect/multiselect.html", '<div class="form-group schema-form-select {{form.htmlClass}}">\r\n    <label class="control-label" ng-show="showTitle()">{{form.title}}</label>\r\n    <ui-select select-multiple multiple ng-model="$$value$$" separator="form.separator" choices="choices" enum="form.enum" map="form.map" lock="form.locked" url="form.url" ng-disabled="disabled">\r\n        <ui-select-match placeholder="{{placeholder}}">{{common.prettifyTitle($item.name)}}</ui-select-match>\r\n        <ui-select-choices\r\n                group-by="group"\r\n                repeat="elem.value as elem in availableElems | filter: $select.search"\r\n                refresh="refreshData($select.search)">\r\n            {{getTitle(elem)}}\r\n        </ui-select-choices>\r\n    </ui-select>\r\n</div>');
} ]);

angular.module("schemaForm").directive("selectMultiple", [ "$http", "$routeParams", "models", "common", function($http, $routeParams, models, common) {
    function convertToMap(elements) {
        var map = [];
        angular.forEach(elements, function(val) {
            if (val.name && val.value) {
                map.push(val);
            } else if (val.split) {
                map.push({
                    name: val,
                    value: val
                });
            } else {
                console.error("Invalid value", val, "for multiselect element");
            }
        });
        return map;
    }
    function addStringToMap(val, map) {
        var exists = false;
        angular.forEach(map, function(v) {
            if (v.value == val) {
                exists = true;
            }
        });
        if (!exists) {
            map.push({
                name: val,
                value: val
            });
        }
        return map;
    }
    return {
        restrict: "AE",
        scope: false,
        link: function(scope, element, attrs, ngModel) {
            scope.common = common;
            scope.grouping = false;
            scope.separator = scope.$eval(attrs.separator);
            scope.url = scope.$eval(attrs.url);
            scope.lock = scope.$eval(attrs.lock);
            scope.availableElems = [];
            scope.placeholder = "Select";
            scope.enum = scope.$eval(attrs.enum);
            scope.map = scope.$eval(attrs.map);
            if (scope.separator) {
                scope.group = function(item) {
                    return item.name.split(scope.separator)[0];
                };
                scope.grouping = true;
            }
            scope.getTitle = function(val) {
                if (scope.separator) {
                    var splitted = val.name.split(scope.separator);
                    splitted.splice(0, 1);
                    var value = splitted.join(scope.separator);
                    return common.prettifyTitle(value, scope.separator);
                } else {
                    return common.prettifyTitle(val.name);
                }
            };
            scope.refreshData = function(item) {
                if (!scope.lock) {
                    if (item) {
                        scope.availableElems = addStringToMap(item, scope.availableElems);
                    }
                }
            };
            if (scope.url) {
                if (common.hasAngularVariable(scope.url)) {
                    if ($routeParams.id) {
                        models.getDocument($routeParams.schema, $routeParams.id, function(doc) {
                            var a = common.deAngularizeUrl(doc, scope.url);
                            $http.get(a).then(function(elems) {
                                var d = elems.data;
                                if (d instanceof Array) {
                                    scope.availableElems = convertToMap(d);
                                } else {
                                    console.error("Invalid values for multiselect", "values:", d);
                                }
                            });
                        });
                    } else {
                        scope.placeholder = "Cannot resolve variable " + common.getAngularVariables(scope.url) + ". Please save the document first";
                        scope.availableElems = convertToMap(scope.$eval(attrs.choices) || []);
                    }
                } else {
                    $http.get(scope.url).then(function(elems) {
                        var d = elems.data;
                        if (d instanceof Array) {
                            scope.availableElems = convertToMap(d);
                        } else {
                            console.error("Invalid values for multiselect", "values:", d);
                        }
                    });
                }
            } else {
                if (scope.map) {
                    scope.availableElems = convertToMap(scope.map);
                } else if (scope.enum) {
                    scope.availableElems = convertToMap(scope.enum);
                } else {
                    console.error("Bad configuration for multiselect");
                }
            }
        }
    };
} ]);

angular.module("schemaForm").config([ "schemaFormProvider", "schemaFormDecoratorsProvider", "sfPathProvider", function(schemaFormProvider, schemaFormDecoratorsProvider, sfPathProvider) {
    var multiselect = function(name, schema, options) {
        if (schema.type === "array" && schema.items.type === "string" && (schema.items.enum || schema.items.enumUrl || schema.items.map)) {
            var f = schemaFormProvider.stdFormObj(name, schema, options);
            f.key = options.path;
            f.type = "multiselect";
            f.map = schema.items.map;
            f.enum = schema.items.enum;
            f.path = schema.path;
            f.separator = schema.items.separator;
            f.locked = schema.items.limitToOptions || false;
            f.url = schema.items.enumUrl;
            options.lookup[sfPathProvider.stringify(options.path)] = f;
            return f;
        }
    };
    schemaFormProvider.defaults.array.unshift(multiselect);
    schemaFormDecoratorsProvider.addMapping("bootstrapDecorator", "multiselect", "directives/decorators/bootstrap/multiselect/multiselect.html");
    schemaFormDecoratorsProvider.createDirective("multiselect", "directives/decorators/bootstrap/multiselect/multiselect.html");
} ]);

angular.module("schemaForm").run([ "$templateCache", function($templateCache) {
    $templateCache.put("directives/decorators/bootstrap/rating/rating.html", '<div class="form-group" ng-class="{\'has-error\': hasError()}">\n    <label class="control-label" ng-show="showTitle()">{{form.title}}</label>\n    <rating bk-rating ng-model="$$value$$" max="form.maxValue" min="form.minValue" state-on="form.iconOn" state-off="form.iconOff"></rating>\n</div>');
} ]);

angular.module("schemaForm").directive("bkRating", [ "$http", "$routeParams", function($http, $routeParams) {
    return {
        restrict: "AE",
        link: function(scope, element, attrs, ngModel) {}
    };
} ]);

angular.module("schemaForm").config([ "schemaFormProvider", "schemaFormDecoratorsProvider", "sfPathProvider", function(schemaFormProvider, schemaFormDecoratorsProvider, sfPathProvider) {
    var mixed = function(name, schema, options) {
        if (schema.type === "number" && schema.format === "rating") {
            var f = schemaFormProvider.stdFormObj(name, schema, options);
            f.key = options.path;
            f.type = "rating";
            if (schema.minValue) f.minValue = schema.minValue;
            if (schema.maxValue) f.maxValue = schema.maxValue;
            if (schema.iconOn) f.iconOn = schema.iconOn;
            if (schema.iconOff) f.iconOff = schema.iconOff;
            options.lookup[sfPathProvider.stringify(options.path)] = f;
            return f;
        }
    };
    schemaFormProvider.defaults.number.unshift(mixed);
    schemaFormDecoratorsProvider.addMapping("bootstrapDecorator", "rating", "directives/decorators/bootstrap/rating/rating.html");
    schemaFormDecoratorsProvider.createDirective("rating", "directives/decorators/bootstrap/rating/rating.html");
} ]);

angular.module("schemaForm").run([ "$templateCache", function($templateCache) {
    $templateCache.put("directives/decorators/bootstrap/tinymce/tinymce.html", '<div class="form-group {{form.htmlClass}}" ng-class="{\'has-error\': hasError()}">\r\n    <label class="control-label" ng-show="showTitle()">{{form.title}}</label>\r\n    <textarea\r\n            ri-tinymce="form.tinymceOptions"\r\n            ng-model="$$value$$"\r\n            style="background-color: white"\r\n            schema-validate="form">\r\n    </textarea>\r\n    <span class="help-block">{{ (hasError() && errorMessage(schemaError())) || form.description}}</span>\r\n</div>');
    $templateCache.put("directives/decorators/bootstrap/tinymce/tinyvision.html", '\x3c!--<!DOCTYPE html>--\x3e\r\n\x3c!--<html lang="en">--\x3e\r\n\x3c!--<head>--\x3e\r\n\x3c!--<meta charset="utf-8">--\x3e\r\n\x3c!--<meta http-equiv="X-UA-Compatible" content="IE=edge, chrome=1">--\x3e\r\n\x3c!--<meta name="viewport" content="width=device-width, initial-scale=1.0">--\x3e\r\n\x3c!--<title>TinyVision</title>--\x3e\r\n<style>\r\n    /*body {*/\r\n    /*margin: 0 !important;*/\r\n    /*padding: 51px 0 0 !important;*/\r\n    /*}*/\r\n\r\n    @-webkit-keyframes spin {\r\n        100% {\r\n            -webkit-transform: rotate(360deg);\r\n        }\r\n    }\r\n\r\n    @-moz-keyframes spin {\r\n        100% {\r\n            -moz-transform: rotate(360deg);\r\n        }\r\n    }\r\n\r\n    @-ms-keyframes spin {\r\n        100% {\r\n            -ms-transform: rotate(360deg);\r\n        }\r\n    }\r\n\r\n    @-o-keyframes spin {\r\n        100% {\r\n            -o-transform: rotate(360deg);\r\n        }\r\n    }\r\n\r\n    @keyframes spin {\r\n        100% {\r\n            transform: rotate(360deg);\r\n        }\r\n    }\r\n\r\n    @font-face {\r\n        font-family: \'TinyVision\';\r\n        font-style: normal;\r\n        font-weight: normal;\r\n        src: url(data:application/font-woff;charset=utf-8;base64,d09GRgABAAAAAAgEAAsAAAAAB7gAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABPUy8yAAABCAAAAGAAAABgDxIGd2NtYXAAAAFoAAAAbAAAAGzTJ8o7Z2FzcAAAAdQAAAAIAAAACAAAABBnbHlmAAAB3AAAA8QAAAPE/czNkmhlYWQAAAWgAAAANgAAADYMwYWHaGhlYQAABdgAAAAkAAAAJAgMBBFobXR4AAAF/AAAACgAAAAoHWoAgGxvY2EAAAYkAAAAFgAAABYEggOgbWF4cAAABjwAAAAgAAAAIAASAF9uYW1lAAAGXAAAAYYAAAGGmUoJ+3Bvc3QAAAfkAAAAIAAAACAAAwAAAAMDoQGQAAUAAAKZAswAAACPApkCzAAAAesAMwEJAAAAAAAAAAAAAAAAAAAAARAAAAAAAAAAAAAAAAAAAAAAQAAA6awDwP/AAEADwABAAAAAAQAAAAAAAAAAAAAAIAAAAAAAAwAAAAMAAAAcAAEAAwAAABwAAwABAAAAHAAEAFAAAAAQABAAAwAAAAEAIOAC6THpZ+ms//3//wAAAAAAIOAA6THpZ+ms//3//wAB/+MgBBbWFqEWXQADAAEAAAAAAAAAAAAAAAAAAAAAAAEAAf//AA8AAQAAAAAAAAAAAAIAADc5AQAAAAABAAAAAAAAAAAAAgAANzkBAAAAAAEAAAAAAAAAAAACAAA3OQEAAAAAAgAAAAkDbgN3AC8AXAAAARQVBgcGIyInJicHBiMiJyY1ETQ3NjMhMhcWFRQPARYXFjMyNzY3Njc2OwEyFxYVExEUBwYjISInJjU0PwEmIyIHBgcGBwYrASInJj0BNjc2MzIXFhc3NjMyFxYVA18ldHWcVE5OPUoLDg8LCwsLDwEADgsLC04pMzM4TENCKAYYBQxuCAUFDwsLD/8ADwsKCk9Uc01CQigHGAQNcQgFBiV2dZ1TT089SgsPDwsLAWUDAZpfXyAfOkkLCwoPAQAPCwsLCw8PCk8lFRUmJUEKOQ0GBQcByf8ADwsLCwsPDwpPTyYlQQo5DQYFBwSaX18gIDlJCwsKDwAAAgAAAFIESQN3AB8AQwAAATQvASYjIg8BBhUUFxY7ARUUFxY7ATI3Nj0BMzI3NjUFFAcGIyEiJyY1NDc2NyY1NDc2MzIXFhc2MzIXFhUUBxYXFhUC2wXJBQgIBckFBQUIgAUGB24HBgWACAUFAW5AQFv9kmpLSygoQwFWVnlZSkoiKDc8KysYSy8wAdIIBcoFBckHBwgFBckIBQUFBQjJBQYHpFtAQUtMaUs+PyARB3lWVjIyUiQrKz0rJBE8PEwAAgAA/8ADtwN3ABAANwAAATQnJiMiBwYVFBcWMzI3NjUBFAcGIyIvAQYjIicmJyYnJjU0NzY3Njc2MzIXFhcWFxYVFAcXFhUCkktLamlMS0tMaWpLSwElFhYdHxXEZn5RS0s2Nh8gIB82NktLUVJLSjY2ICBHxBUB5WlLTExLaWpLS0tLav4kHhUWFsNHICA2NkpLUlFLSjY2ICAgIDY2SktRfmbEFh4AAgAAAAAEAANAAAUAEQAAASchESERASMVIzUjNTM1MxUzAkCA/kAEAP7AgICAgICAAsCA/MACwP5AgICAgIAAAAEAQP/AAvoDwAANAAAFPgEuAQcVCQEVNh4BAgL6KyY4q6j+gAGAyeNGT0BNtpplBP4BgAGA+AWc7P7tAAcAQP/AA4ADwAAJAA0AEQAVABkALQAxAAATERQWMyEyNjURASMRMxMjETMTIxEzEyMRMxMjNTQmKwEiBh0BIyIGHQEhNTQmISM1M4AmGgJAGib+AEBAgEBAgEBAgEBAkNAcFOAUHNAUHANAHP7cwMACgP2AGiYmGgKA/cABwP5AAcD+QAHA/kABwAFAUBQcHBRQHBRQUBQcPwAAAAEAAAAAAADd95b5Xw889QALBAAAAAAA1K0ghQAAAADUrSCFAAD/wARJA8AAAAAIAAIAAAAAAAAAAQAAA8D/wAAABEgAAP/+BEkAAQAAAAAAAAAAAAAAAAAAAAoEAAAAAAAAAAAAAAACAAAAA2wAAARIAAADtgAABAAAAAQAAEAEAABAAAAAAAAKABQAHgCiAQIBVgF2AZQB4gAAAAEAAAAKAF0ABwAAAAAAAgAAAAAAAAAAAAAAAAAAAAAAAAAOAK4AAQAAAAAAAQAHAAAAAQAAAAAAAgAHAGAAAQAAAAAAAwAHADYAAQAAAAAABAAHAHUAAQAAAAAABQALABUAAQAAAAAABgAHAEsAAQAAAAAACgAaAIoAAwABBAkAAQAOAAcAAwABBAkAAgAOAGcAAwABBAkAAwAOAD0AAwABBAkABAAOAHwAAwABBAkABQAWACAAAwABBAkABgAOAFIAAwABBAkACgA0AKRpY29tb29uAGkAYwBvAG0AbwBvAG5WZXJzaW9uIDEuMABWAGUAcgBzAGkAbwBuACAAMQAuADBpY29tb29uAGkAYwBvAG0AbwBvAG5pY29tb29uAGkAYwBvAG0AbwBvAG5SZWd1bGFyAFIAZQBnAHUAbABhAHJpY29tb29uAGkAYwBvAG0AbwBvAG5Gb250IGdlbmVyYXRlZCBieSBJY29Nb29uLgBGAG8AbgB0ACAAZwBlAG4AZQByAGEAdABlAGQAIABiAHkAIABJAGMAbwBNAG8AbwBuAC4AAAADAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA) format("truetype");\r\n    }\r\n\r\n    #tinyvision .tv-icon {\r\n        display: inline-block;\r\n        font-family: \'TinyVision\';\r\n        font-style: normal;\r\n        font-size: 16px;\r\n        text-transform: none;\r\n        font-variant: normal;\r\n        font-weight: normal;\r\n        line-height: 1;\r\n        speak: none;\r\n        vertical-align: text-bottom;\r\n        -webkit-font-smoothing: antialiased;\r\n    }\r\n\r\n    #tinyvision .tv-icon-refresh:before {\r\n        content: "\\e000";\r\n    }\r\n\r\n    #tinyvision .tv-icon-upload:before {\r\n        content: "\\e001";\r\n    }\r\n\r\n    #tinyvision .tv-icon-remove:before {\r\n        content: "\\e9ac";\r\n    }\r\n\r\n    #tinyvision .tv-icon-folder:before {\r\n        content: "\\e931";\r\n    }\r\n\r\n    #tinyvision .icon-back:before {\r\n        font-family: \'TinyVision\';\r\n        content: "\\e967";\r\n    }\r\n\r\n    #tinyvision .tv-toolbar {\r\n        border-bottom: 1px solid #9e9e9e;\r\n        left: 0;\r\n        padding: 10px;\r\n        position: fixed;\r\n        right: 0;\r\n        top: 0;\r\n        z-index: 1000;\r\n    }\r\n\r\n    #tinyvision .tv-toolbar-left {\r\n        float: left;\r\n    }\r\n\r\n    #tinyvision .tv-toolbar-left > * {\r\n        float: left;\r\n        margin-right: 3px;\r\n    }\r\n\r\n    #tinyvision .tv-toolbar-right {\r\n        float: right;\r\n    }\r\n\r\n    #tinyvision .tv-toolbar-right > * {\r\n        float: left;\r\n        margin-left: 3px;\r\n    }\r\n\r\n    #tinyvision .tv-upload .tv-icon-upload {\r\n        margin-right: 3px;\r\n    }\r\n\r\n    #tinyvision .tv-search .tv-icon-search {\r\n        cursor: text;\r\n        left: 11px;\r\n        position: absolute;\r\n        top: 6px;\r\n    }\r\n\r\n    #tinyvision .tv-search input {\r\n        padding-left: 35px;\r\n        width: 200px;\r\n    }\r\n\r\n    #tinyvision .tv-notice {\r\n        border: 1px solid #eee;\r\n        color: #9e9e9e;\r\n        display: none;\r\n        font-size: 20px;\r\n        margin: 15% auto 0;\r\n        padding: 20px;\r\n        text-align: center;\r\n        white-space: normal;\r\n        width: 50%;\r\n    }\r\n\r\n    #tinyvision .tv-items {\r\n        list-style: none;\r\n        margin: 10px auto;\r\n        width: 660px;\r\n    }\r\n\r\n    #tinyvision .tv-item {\r\n        float: left;\r\n        margin: 10px;\r\n    }\r\n\r\n    #tinyvision .tv-item.selected .tv-item-image {\r\n        border: 2px solid #0088cc !important;\r\n        padding: 4px;\r\n    }\r\n\r\n    #tinyvision .tv-item.selected .tv-item-name {\r\n        color: #0088cc !important;\r\n    }\r\n\r\n    #tinyvision .tv-item-link {\r\n        cursor: pointer;\r\n        display: block;\r\n        text-decoration: none;\r\n    }\r\n\r\n    #tinyvision .tv-item-link:hover .tv-item-image {\r\n        border-color: #9e9e9e;\r\n    }\r\n\r\n    #tinyvision .tv-item-link:hover .tv-item-name {\r\n        color: #000;\r\n    }\r\n\r\n    #tinyvision .tv-item-dir {\r\n        border: 1px solid #eee;\r\n        height: 100px;\r\n        line-height: 100px;\r\n        padding: 5px;\r\n        text-align: center;\r\n        width: 100px;\r\n    }\r\n\r\n    #tinyvision .tv-item-dir span {\r\n        max-height: 100px;\r\n        max-width: 100px;\r\n        min-height: 1px;\r\n        min-width: 1px;\r\n        vertical-align: middle;\r\n        font-size: 70px;\r\n        font-family: \'Glyphicons Halflings\';\r\n        color: #696969;\r\n    }\r\n\r\n    #tinyvision .tv-item-image {\r\n        border: 1px solid #eee;\r\n        height: 100px;\r\n        line-height: 100px;\r\n        padding: 5px;\r\n        text-align: center;\r\n        width: 100px;\r\n    }\r\n\r\n    #tinyvision .tv-item-image img {\r\n        max-height: 100px;\r\n        max-width: 100px;\r\n        min-height: 1px;\r\n        min-width: 1px;\r\n        vertical-align: middle;\r\n    }\r\n\r\n    #tinyvision .tv-item-name {\r\n        color: #9e9e9e;\r\n        padding: 5px;\r\n        overflow: hidden;\r\n        text-overflow: ellipsis;\r\n        white-space: nowrap;\r\n        width: 100px;\r\n    }\r\n\r\n    .cf:before,\r\n    .cf:after {\r\n        content: \' \';\r\n        display: table;\r\n    }\r\n\r\n    .cf:after {\r\n        clear: both;\r\n    }\r\n</style>\r\n\x3c!--<link rel="stylesheet" href="tinyvision.css">--\x3e\r\n\x3c!--</head>--\x3e\r\n\x3c!--<body>--\x3e\r\n<div class="mce-container" id="tinyvision">\r\n    <div class="tv-toolbar mce-panel cf">\r\n        <div class="tv-toolbar-left">\r\n            <div class="tv-upload mce-widget mce-btn">\r\n                <button ng-if="isEmptyDir" type="button" ng-click="removeDir()" id="remove-dir"><span\r\n                        class="tv-icon tv-icon-remove"></span> Remove directory\r\n                </button>\r\n                <button ng-if="!isEmptyDir" type="button" ng-click="removeFile()" id="remove"><span\r\n                        class="tv-icon tv-icon-remove"></span> Remove\r\n                </button>\r\n            </div>\r\n            <div class="tv-upload mce-widget mce-btn">\r\n                <button type="button" ng-click="refresh()" id="refresh"><span\r\n                        class="tv-icon tv-icon-refresh"></span> Refresh\r\n                </button>\r\n            </div>\r\n            <div class="tv-upload mce-widget mce-btn">\r\n                <button type="button" ng-click="openUploadModal()" id="upload"><span\r\n                        class="tv-icon tv-icon-upload"></span> Upload\r\n                </button>\r\n            </div>\r\n        </div>\r\n        <div class="tv-toolbar-right">\r\n            <div class="tv-search mce-widget">\r\n                <span class="tv-icon tv-icon-search"></span>\r\n                <input class="mce-textbox" ng-model="dir" placeholder="Directory name">\r\n            </div>\r\n            <div class="tv-refresh mce-widget mce-btn">\r\n                <button type="button" id="create" ng-click="createDir(dir)"><span class="tv-icon tv-icon-folder"></span>\r\n                </button>\r\n            </div>\r\n        </div>\r\n    </div>\r\n    <div class="tv-notice" id="notice"></div>\r\n    <ol class="tv-items cf" id="items">\r\n        <li ng-if="pathStack" class="tv-item">\r\n            <a ng-click="findByPath(\'..\')" class="tv-item-link" title="{{name}}">\r\n                <div class="tv-item-dir">\r\n                    <span class="glyphicon glyphicon-folder-open" aria-hidden="true"></span>\r\n                </div>\r\n                <div class="tv-item-name"><span class="icon-back"></span> Back</div>\r\n            </a>\r\n        </li>\r\n        <li ng-repeat="e in data.directories track by $index" class="tv-item">\r\n            <a ng-click="findByPath(e)" class="tv-item-link" title="{{name}}">\r\n                <div class="tv-item-dir">\r\n                    <span class="glyphicon glyphicon-folder-close" aria-hidden="true"></span>\r\n                </div>\r\n                <div class="tv-item-name">{{e}}</div>\r\n            </a>\r\n        </li>\r\n        <li ng-repeat="e in data.image track by $index" class="tv-item" ng-class="{\'selected\':selected==e}">\r\n            <a ng-click="setSelected(e)" class="tv-item-link" title="{{e}}">\r\n                <div class="tv-item-image">\r\n                    <img ng-src="{{getFullPath(e)}}">\r\n                </div>\r\n                <div class="tv-item-name">{{e}}</div>\r\n            </a>\r\n        </li>\r\n        <li ng-repeat="e in data.video track by $index" class="tv-item" ng-class="{\'selected\':selected==e}">\r\n            <a ng-click="setSelected(e)" class="tv-item-link" title="{{e}}">\r\n                <div class="tv-item-image">\r\n                    <img ng-src="{{getFullPath(e)}}">\r\n                </div>\r\n                <div class="tv-item-name">{{e}}</div>\r\n            </a>\r\n        </li>\r\n        <li ng-repeat="e in data.file track by $index" class="tv-item" ng-class="{\'selected\':selected==e}">\r\n            <a ng-click="setSelected(e)" class="tv-item-link" title="{{e}}">\r\n                <div class="tv-item-dir">\r\n                    <span class="glyphicon glyphicon-file" aria-hidden="true"></span>\r\n                </div>\r\n                <div class="tv-item-name"><a href="{{getFullPath(e)}}" target="_blank">{{e}}</a></div>\r\n            </a>\r\n        </li>\r\n    </ol>\r\n</div>\r\n\x3c!--&lt;!&ndash;<script src="tinyvision.min.js"><\/script>&ndash;&gt;--\x3e\r\n\x3c!--</body>--\x3e\r\n\x3c!--</html>--\x3e\r\n\x3c!--MODAL FOR VALIDATION--\x3e\r\n<style>\r\n    .modal {\r\n        z-index: 15001 !important;\r\n    }\r\n\r\n    .modal-dialog {\r\n        z-index: 15001 !important;\r\n    }\r\n\r\n    #mce-modal-block {\r\n        z-index: 15000 !important;\r\n    }\r\n\r\n    .mce-floatpanel {\r\n        z-index: 15001 !important;\r\n    }\r\n\r\n    #mce-modal-block .mce-panel {\r\n        z-index: 15001 !important;\r\n    }\r\n\r\n    droplet {\r\n        display: inline-block;\r\n        z-index: 15003;\r\n        position: relative;\r\n        border-radius: 2px;\r\n        width: 100%;\r\n        height: 400px;\r\n        background-color: rgba(255, 255, 255, .1);\r\n        margin-top: -5px;\r\n        padding-top: 5px;\r\n        transition: box-shadow 0.35s;\r\n    }\r\n\r\n    droplet.event-dragover {\r\n        box-shadow: inset 0 0 100px rgba(255, 255, 255, .25), inset 0 0 5px rgba(255, 255, 255, .25);\r\n    }\r\n\r\n    droplet ul.files {\r\n        height: 100%;\r\n        width: 100%;\r\n        overflow-y: auto;\r\n        padding: 5px;\r\n        list-style-type: none;\r\n        transition: all .5s;\r\n    }\r\n\r\n    droplet ul.files li {\r\n        width: 100px;\r\n        height: 100px;\r\n        padding: 1px;\r\n        float: left;\r\n        position: relative;\r\n        margin: 5px;\r\n    }\r\n\r\n    droplet ul.files li img.droplet-preview {\r\n        max-width: 96px;\r\n        background-size: cover;\r\n        background-repeat: no-repeat;\r\n        height: 96px;\r\n        width: 96px;\r\n        background-color: white;\r\n        box-shadow: 0 0 10px rgba(0, 0, 0, .25);\r\n        border: 1px solid white;\r\n        display: block;\r\n    }\r\n\r\n    droplet ul.files li div.delete {\r\n        background-color: rgba(0, 0, 0, .25);\r\n        width: 50px;\r\n        height: 50px;\r\n        font-family: Lato, Arial, Tahoma, Helvetica, sans-serif;\r\n        color: white;\r\n        font-size: 25px;\r\n        text-shadow: 1px 1px 0 rgba(0, 0, 0, .25);\r\n        text-align: center;\r\n        cursor: pointer;\r\n        line-height: 50px;\r\n        position: absolute;\r\n        border-radius: 50%;\r\n        z-index: 1010;\r\n        top: 25px;\r\n        left: 25px;\r\n        opacity: 0;\r\n        transition: all .30s;\r\n        transform: scale(0.5);\r\n    }\r\n\r\n    droplet ul.files li:hover div.delete {\r\n        opacity: 1;\r\n        transform: scale(1);\r\n    }\r\n\r\n    droplet ul.files li div.delete:hover {\r\n        background-color: rgba(0, 0, 0, .45);\r\n    }\r\n\r\n    droplet ul.files li div.size {\r\n        background-color: rgba(255, 255, 255, .5);\r\n        position: absolute;\r\n        bottom: 5px;\r\n        right: 5px;\r\n        pointer-events: none;\r\n        font-size: 9px;\r\n        font-family: Lato, Arial, Tahoma, Helvetica, sans-serif;\r\n        padding: 1px 4px;\r\n    }\r\n</style>\r\n<script type="text/ng-template" id="imgUploader.html">\r\n    <div class="modal-header">\r\n        <h3 class="modal-title">Upload Files</h3>\r\n    </div>\r\n    <div class="modal-body">\r\n        <droplet ng-model="dropletint">\r\n\r\n            \x3c!--<div class="loading" ng-class="{ visible: dropletint.isUploading() }">\r\n                <svg viewBox="0 0 400 400">\r\n                    <path class="loading-path" data-progressbar ng-model="dropletint.progress.percent"\r\n                          d="M 0,1 L 398,1 L 398,234 L 1,234 L 0,1"\r\n                          stroke="#D3B2D1" stroke-width="1" fill-opacity="0"\r\n                          style="stroke-dasharray: 392px, 392px;stroke-dashoffset: 392px;"></path>\r\n                </svg>\r\n            </div>--\x3e\r\n            <section ng-show="dropletint.isUploading()">Upload done. Press Cancel button or ESC key</section>\r\n\r\n            <ul class="files">\r\n                <li ng-hide="dropletint.isUploading()"\r\n                    ng-repeat="filemodel in dropletint.getFiles(dropletint.FILE_TYPES.VALID)">\r\n                    <droplet-preview ng-model="filemodel"></droplet-preview>\r\n                    <div class="delete" ng-click="filemodel.deleteFile()">&times;</div>\r\n                    <div class="size">{{filemodel.file.size / 1024 / 1024 | number: 1}}MB</div>\r\n                </li>\r\n            </ul>\r\n        </droplet>\r\n    </div>\r\n    <div class="modal-footer">\r\n        <button class="btn btn-default" ng-click="cancel()">Cancel</button>\r\n        <button class="btn btn-primary" ng-click="dropletint.uploadFiles()" ng-hide="dropletint.isUploading()">\r\n            Upload files\r\n        </button>\r\n    </div>\r\n<\/script>');
} ]);

angular.module("schemaForm").directive("riTinymce", [ "$http", "$window", "$modal", function($http, $window, $modal) {
    var count = 0;
    var defaultConf = {
        plugins: "code image -tinyvision autoresize fullscreen media link paste preview textcolor",
        toolbar1: "undo redo | styleselect fontsizeselect | bold italic | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | link image media | preview | fullscreen | forecolor backcolor",
        image_advtab: true,
        forced_root_block: "p",
        width: "100%",
        height: 400,
        autoresize_min_height: 400,
        autoresize_max_height: 800,
        fullscreen_new_window: true,
        skin_url: "extra/tinymce/skins/lightgray",
        fullscreen_settings: {
            theme_advanced_path_location: "top"
        },
        paste_preprocess: function(pl, o) {
            o.content = o.content.replace(/(<b>)/gi, "<strong>");
            o.content = o.content.replace(/(<\/b>)/gi, "</strong>");
            o.content = o.content.replace(/(<i>)/gi, "<em>");
            o.content = o.content.replace(/(<\/i>)/gi, "</em>");
        }
    };
    return {
        restrict: "A",
        require: "ngModel",
        scope: false,
        link: function(scope, element, attrs, ngModel) {
            var tinymce;
            if (!attrs.id) {
                attrs.$set("id", "ri-tinymce-" + count++);
            } else {
                var focus = function() {
                    if (tinymce) {}
                };
                if ($window.jQuery) {
                    jQuery("label[for=" + attrs.id + "]");
                }
            }
            function destroy() {
                if (tinymce) {
                    tinymce.save();
                    tinymce.remove();
                    tinymce = null;
                }
            }
            scope.destroy = destroy;
            scope.$on("$destroy", destroy);
            scope.$watch(attrs.ngModel, function(value, old) {
                console.log(value, old);
                if (tinymce && angular.isDefined(value)) {
                    var content = tinymce.getContent();
                    if (angular.isString(value) && content !== value) {
                        tinymce.setContent(value);
                    }
                }
            });
            var init = function(config) {
                config = angular.extend(config || {}, defaultConf, {
                    selector: "#" + attrs.id,
                    setup: function(editor) {
                        tinymce = editor;
                        $window["focus" + attrs.id] = function() {
                            tinymce.execCommand("mceFocus", false, attrs.id);
                        };
                        var update = function() {
                            var content = editor.getContent();
                            if (ngModel.$viewValue !== content) {
                                ngModel.$setViewValue(content);
                                if (!scope.$root.$$phase) {
                                    scope.$apply();
                                }
                            }
                        };
                        editor.on("change", update);
                        editor.on("KeyUp", update);
                        editor.on("ExecCommand", update);
                        editor.on("focus", function(e) {
                            angular.element(e.target.contentAreaContainer).addClass("tx-tinymce-active");
                        });
                        editor.on("blur", function(e) {
                            angular.element(e.target.contentAreaContainer).removeClass("tx-tinymce-active");
                        });
                        console.log("--\x3e " + ngModel.$viewValue);
                    }
                });
                tinyMCE.init(config);
            };
            if (attrs.riTinymce) {
                scope.$watch(attrs.riTinymce, function(c, old) {
                    console.log(c);
                    destroy();
                    if (c) init(c); else init();
                });
            } else {
                init();
                destroy();
            }
        }
    };
} ]);

angular.module("schemaForm").run([ "$templateCache", function($templateCache) {
    tinymce.PluginManager.add("tinyvision", function(editor, pluginUrl) {
        var self = {};
        self.win = null;
        self.WINDOW_HEIGHT = 537;
        self.WINDOW_BODY = "<tinyvision></tinyvision>";
        self.WINDOW_WIDTH = 702;
        self.skinUrl = function() {
            var regex = /\/skins\/\w+\/skin(\.min)?\.css$/, styleSheets = document.styleSheets, styleSheetsLength = styleSheets.length, styleSheetHref, url;
            for (var i = 0; i < styleSheetsLength; i += 1) {
                styleSheetHref = styleSheets[i].href;
                if (styleSheetHref && styleSheetHref.match(regex)) {
                    url = styleSheetHref;
                    break;
                }
            }
            return url;
        };
        self.scope = function() {
            return angular.element(self.win.getEl()).scope().$$childTail;
        };
        self.selected = function() {
            return self.scope().getCompleteSelected();
        };
        self.populateField = function(field) {
            var selected = self.selected();
            field.value = selected ? selected : "";
            return self;
        };
        self.openWindow = function(fieldId, fieldValue, type, parentWin) {
            self.win = editor.windowManager.open({
                title: "Select " + type,
                html: self.WINDOW_BODY,
                buttons: [ {
                    text: "Select",
                    subtype: "primary",
                    onclick: function() {
                        self.populateField(parentWin.document.getElementById(fieldId));
                        self.win.close();
                    }
                }, {
                    text: "Cancel",
                    onclick: "close"
                } ],
                width: self.WINDOW_WIDTH,
                height: self.WINDOW_HEIGHT
            }, {
                fieldValue: fieldValue,
                options: editor.settings.tinyvision,
                skinUrl: self.skinUrl(),
                type: type
            });
            taka = self.win;
            angular.element(document).injector().invoke([ "$compile", "$rootScope", function($compile, $rootScope) {
                var $targetDom = $("#" + self.win._id + "-body");
                var $scope = $targetDom.html("<tinyvision></tinyvision>").scope();
                $compile($targetDom)($scope);
                $rootScope.$digest();
            } ]);
            return self;
        };
        editor.addCommand("tinyvision", function(options) {
            self.openWindow(options.fieldId, options.fieldValue, options.type, options.win);
        });
        editor.settings.file_browser_callback = self.openWindow;
    });
} ]).directive("tinyvision", [ "$http", "$modal", "models", function($http, $modal, models) {
    return {
        restrict: "E",
        templateUrl: "directives/decorators/bootstrap/tinymce/tinyvision.html",
        scope: {
            ngModel: "="
        },
        link: function(scope, element, attrs, ngModel) {
            var pathStack = [];
            scope.findByPath = function(path) {
                scope.data = undefined;
                if (path === "..") {
                    pathStack.pop();
                } else if (path !== "") {
                    pathStack.push(path);
                }
                models.galleryGetByPath(pathStack.join("/") + "/", function(data) {
                    scope.pathStack = pathStack.join("/");
                    scope.isEmptyDir = isEmptyDir(data);
                    scope.data = data;
                });
            };
            scope.setSelected = function(e) {
                scope.selected = e;
                scope.ngModel = scope.getCompleteSelected();
                console.log("ngModel " + ngModel);
                console.log("scope.ngModel " + scope.ngModel);
                console.log("selected " + scope.selected);
            };
            scope.getCompleteSelected = function() {
                return scope.getFullPath(scope.selected);
            };
            scope.getFullPath = function(img) {
                return (models.getGalleryPath() + pathStack.join("/") + "/" + img).replace(/([^:]\/)\/+/g, "$1");
            };
            scope.openUploadModal = function() {
                $modal.open({
                    templateUrl: "imgUploader.html",
                    controller: "ModalImgUploaderCtrl",
                    size: "md",
                    resolve: {
                        pathstack: function() {
                            return pathStack;
                        }
                    }
                }).result.then(function() {
                    scope.refresh();
                });
            };
            scope.refresh = function() {
                scope.selected = undefined;
                scope.findByPath("");
            };
            scope.remove = function(path) {
                models.galleryDeleteByPath(pathStack.join("/") + path, function(data) {
                    if (path === "") {
                        scope.findByPath("..");
                    } else {
                        scope.refresh();
                    }
                });
            };
            scope.removeFile = function() {
                if (!scope.selected) return;
                scope.remove("/" + scope.selected);
            };
            scope.removeDir = function() {
                scope.remove("");
            };
            scope.createDir = function(dir) {
                if (!dir) return;
                models.galleryPostByPath(pathStack.join("/") + "/" + dir, function(data) {
                    scope.dir = undefined;
                    scope.refresh();
                });
            };
            function isEmptyDir(data) {
                if (data.image && data.image.length) {
                    return false;
                }
                if (data.video && data.video.length) {
                    return false;
                }
                if (data.file && data.file.length) {
                    return false;
                }
                if (data.directories && data.directories.length) {
                    return false;
                }
                return true;
            }
            scope.refresh();
        }
    };
} ]).controller("ModalImgUploaderCtrl", [ "$scope", "$modalInstance", "$timeout", "loginProvider", "pathstack", "models", function($scope, $modalInstance, $timeout, loginProvider, pathstack, models) {
    $scope.success = false;
    $scope.error = false;
    $scope.$on("$dropletReady", function whenDropletReady() {
        loginProvider.getUser(function(user) {
            $scope.dropletint.allowedExtensions([ "png", "jpg", "bmp", "gif", "csv", "pdf", "zip", "rar", "xls", "xlsx", "xml", "yml", "json", "doc", "docx", "svg", "jpeg" ]);
            $scope.dropletint.setRequestHeaders({
                Authorization: "BEARER " + user.token
            });
            $scope.dropletint.defineHTTPSuccess([ 200, 201 ]);
            $scope.dropletint.setRequestUrl(models.getGalleryPath() + pathstack.join("/"));
        });
    });
    $scope.$on("$dropletSuccess", function onDropletSuccess(event, response, files) {
        $modalInstance.close();
    });
    $scope.cancel = function() {
        $modalInstance.close();
    };
    $modalInstance.result.finally(function() {});
} ]);

angular.module("schemaForm").config([ "schemaFormProvider", "schemaFormDecoratorsProvider", "sfPathProvider", function(schemaFormProvider, schemaFormDecoratorsProvider, sfPathProvider) {
    var wysiwyg = function(name, schema, options) {
        if (schema.type === "string" && schema.format == "html") {
            var f = schemaFormProvider.stdFormObj(name, schema, options);
            f.key = options.path;
            f.type = "wysiwyg";
            f.tinymceOptions = schema.tinymceOptions;
            options.lookup[sfPathProvider.stringify(options.path)] = f;
            return f;
        }
    };
    schemaFormProvider.defaults.string.unshift(wysiwyg);
    schemaFormDecoratorsProvider.addMapping("bootstrapDecorator", "wysiwyg", "directives/decorators/bootstrap/tinymce/tinymce.html");
    schemaFormDecoratorsProvider.createDirective("wysiwyg", "directives/decorators/bootstrap/tinymce/tinymce.html");
} ]);

(function() {
    var punchCardTemplate;
    angular.module("punchCard", []);
    punchCardTemplate = '<div id="punch-card">\n    <div class="punch-card-day" ng-repeat=\'day in days\'>\n        <div class="punch-card-day-name">\n            <div class="punch-card-day-name-label">{{ day }}</div>\n        </div>\n        <div class="punch-card-hour"\n             ng-repeat=\'hour in hours\'\n             ng-init="n = data[$parent.$index][$index]">\n            <div class="punch-card-hour-data size-{{ size(n) }}"></div>\n            <div class="punch-card-hour-tooltip" ng-show="n">\n                <b>{{ n }}</b> {{ description(n) }}\n                <div class="arrow"></div>\n            </div>\n            <div class="punch-card-hour-tick"></div>\n        </div>\n    </div>\n    <div class="punch-card-hour-name">\n        <div class="punch-card-hour-name-label" ng-repeat=\'hour in hours\'>\n            {{ hour }}\n        </div>\n    </div>\n</div>';
    angular.module("punchCard").directive("punchCard", [ "$compile", function($compile) {
        return {
            restrict: "AE",
            scope: {
                data: "=",
                plural: "@",
                singular: "@"
            },
            template: punchCardTemplate,
            link: function($scope, element) {
                $scope.days = [ "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday" ];
                $scope.hours = [ "00", "01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20", "21", "22", "23" ];
                $scope.description = function(n) {
                    if (n === 1) {
                        return $scope.singular || "event";
                    } else {
                        return $scope.plural || "events";
                    }
                };
                return $scope.$watch("data", function(data) {
                    var flatten, max;
                    flatten = [].concat.apply([], $scope.data);
                    max = flatten.sort(function(a, b) {
                        return a - b;
                    })[flatten.length - 1];
                    $scope.size = function(n) {
                        return Math.floor(100 / max * +n / 10);
                    };
                    element.empty();
                    return element.append($compile(punchCardTemplate)($scope));
                });
            }
        };
    } ]);
}).call(this);

(function(root, factory) {
    "use strict";
    if (typeof define === "function" && define.amd) {
        define([], factory);
    } else if (typeof module !== "undefined" && module.exports) {
        module.exports = factory();
    } else {
        root.JsonHuman = factory();
    }
})(this, function() {
    "use strict";
    var indexOf = [].indexOf || function(item) {
        for (var i = 0, l = this.length; i < l; i++) {
            if (i in this && this[i] === item) return i;
        }
        return -1;
    };
    function makePrefixer(prefix) {
        return function(name) {
            return prefix + "-" + name;
        };
    }
    function isArray(obj) {
        return toString.call(obj) === "[object Array]";
    }
    function sn(tagName, className, data) {
        var result = document.createElement(tagName);
        result.className = className;
        result.appendChild(document.createTextNode("" + data));
        return result;
    }
    function scn(tagName, className, child) {
        var result = document.createElement(tagName), i, len;
        result.className = className;
        if (isArray(child)) {
            for (i = 0, len = child.length; i < len; i += 1) {
                result.appendChild(child[i]);
            }
        } else {
            result.appendChild(child);
        }
        return result;
    }
    function linkNode(child, href, target) {
        var a = scn("a", HYPERLINK_CLASS_NAME, child);
        a.setAttribute("href", href);
        a.setAttribute("target", target);
        return a;
    }
    var toString = Object.prototype.toString, prefixer = makePrefixer("jh"), p = prefixer, ARRAY = 2, BOOL = 4, INT = 8, FLOAT = 16, STRING = 32, OBJECT = 64, SPECIAL_OBJECT = 128, FUNCTION = 256, UNK = 1, STRING_CLASS_NAME = p("type-string"), STRING_EMPTY_CLASS_NAME = p("type-string") + " " + p("empty"), BOOL_TRUE_CLASS_NAME = p("type-bool-true"), BOOL_FALSE_CLASS_NAME = p("type-bool-false"), BOOL_IMAGE = p("type-bool-image"), INT_CLASS_NAME = p("type-int") + " " + p("type-number"), FLOAT_CLASS_NAME = p("type-float") + " " + p("type-number"), OBJECT_CLASS_NAME = p("type-object"), OBJ_KEY_CLASS_NAME = p("key") + " " + p("object-key"), OBJ_VAL_CLASS_NAME = p("value") + " " + p("object-value"), OBJ_EMPTY_CLASS_NAME = p("type-object") + " " + p("empty"), FUNCTION_CLASS_NAME = p("type-function"), ARRAY_KEY_CLASS_NAME = p("key") + " " + p("array-key"), ARRAY_VAL_CLASS_NAME = p("value") + " " + p("array-value"), ARRAY_CLASS_NAME = p("type-array"), ARRAY_EMPTY_CLASS_NAME = p("type-array") + " " + p("empty"), HYPERLINK_CLASS_NAME = p("a"), UNKNOWN_CLASS_NAME = p("type-unk");
    function getType(obj) {
        var type = typeof obj;
        switch (type) {
          case "boolean":
            return BOOL;

          case "string":
            return STRING;

          case "number":
            return obj % 1 === 0 ? INT : FLOAT;

          case "function":
            return FUNCTION;

          default:
            if (isArray(obj)) {
                return ARRAY;
            } else if (obj === Object(obj)) {
                if (obj.constructor === Object) {
                    return OBJECT;
                }
                return OBJECT | SPECIAL_OBJECT;
            } else {
                return UNK;
            }
        }
    }
    function _format(data, options, parentKey) {
        var result, container, key, keyNode, valNode, len, childs, tr, value, isEmpty = true, isSpecial = false, accum = [], type = getType(data);
        var hyperlinksEnabled, aTarget, hyperlinkKeys;
        if (type === BOOL) {
            var boolOpt = options.bool;
            container = document.createElement("div");
            if (boolOpt.showImage) {
                var img = document.createElement("img");
                img.setAttribute("class", BOOL_IMAGE);
                img.setAttribute("src", "" + (data ? boolOpt.img.true : boolOpt.img.false));
                container.appendChild(img);
            }
            if (boolOpt.showText) {
                container.appendChild(data ? sn("span", BOOL_TRUE_CLASS_NAME, boolOpt.text.true) : sn("span", BOOL_FALSE_CLASS_NAME, boolOpt.text.false));
            }
            result = container;
        } else if (type === STRING) {
            if (data === "") {
                result = sn("span", STRING_EMPTY_CLASS_NAME, "(Empty Text)");
            } else {
                result = sn("span", STRING_CLASS_NAME, data);
            }
        } else if (type === INT) {
            result = sn("span", INT_CLASS_NAME, data);
        } else if (type === FLOAT) {
            result = sn("span", FLOAT_CLASS_NAME, data);
        } else if (type & OBJECT) {
            if (type & SPECIAL_OBJECT) {
                isSpecial = true;
            }
            childs = [];
            aTarget = options.hyperlinks.target;
            hyperlinkKeys = options.hyperlinks.keys;
            hyperlinksEnabled = options.hyperlinks.enable && hyperlinkKeys && hyperlinkKeys.length > 0;
            for (key in data) {
                isEmpty = false;
                value = data[key];
                valNode = _format(value, options, key);
                keyNode = sn("th", OBJ_KEY_CLASS_NAME, key);
                if (hyperlinksEnabled && typeof value === "string" && indexOf.call(hyperlinkKeys, key) >= 0) {
                    valNode = scn("td", OBJ_VAL_CLASS_NAME, linkNode(valNode, value, aTarget));
                } else {
                    valNode = scn("td", OBJ_VAL_CLASS_NAME, valNode);
                }
                tr = document.createElement("tr");
                tr.appendChild(keyNode);
                tr.appendChild(valNode);
                childs.push(tr);
            }
            if (isSpecial) {
                result = sn("span", STRING_CLASS_NAME, data.toString());
            } else if (isEmpty) {
                result = sn("span", OBJ_EMPTY_CLASS_NAME, "(Empty Object)");
            } else {
                result = scn("table", OBJECT_CLASS_NAME, scn("tbody", "", childs));
            }
        } else if (type === FUNCTION) {
            result = sn("span", FUNCTION_CLASS_NAME, data);
        } else if (type === ARRAY) {
            if (data.length > 0) {
                childs = [];
                var showArrayIndices = options.showArrayIndex;
                aTarget = options.hyperlinks.target;
                hyperlinkKeys = options.hyperlinks.keys;
                hyperlinksEnabled = parentKey && options.hyperlinks.enable && hyperlinkKeys && hyperlinkKeys.length > 0 && indexOf.call(hyperlinkKeys, parentKey) >= 0;
                for (key = 0, len = data.length; key < len; key += 1) {
                    keyNode = sn("th", ARRAY_KEY_CLASS_NAME, key);
                    value = data[key];
                    if (hyperlinksEnabled && typeof value === "string") {
                        valNode = _format(value, options, key);
                        valNode = scn("td", ARRAY_VAL_CLASS_NAME, linkNode(valNode, value, aTarget));
                    } else {
                        valNode = scn("td", ARRAY_VAL_CLASS_NAME, _format(value, options, key));
                    }
                    tr = document.createElement("tr");
                    if (showArrayIndices) {
                        tr.appendChild(keyNode);
                    }
                    tr.appendChild(valNode);
                    childs.push(tr);
                }
                result = scn("table", ARRAY_CLASS_NAME, scn("tbody", "", childs));
            } else {
                result = sn("span", ARRAY_EMPTY_CLASS_NAME, "(Empty List)");
            }
        } else {
            result = sn("span", UNKNOWN_CLASS_NAME, data);
        }
        return result;
    }
    function format(data, options) {
        options = validateOptions(options || {});
        var result;
        result = _format(data, options);
        result.className = result.className + " " + prefixer("root");
        return result;
    }
    function validateOptions(options) {
        options = validateArrayIndexOption(options);
        options = validateHyperlinkOptions(options);
        options = validateBoolOptions(options);
        return options;
    }
    function validateArrayIndexOption(options) {
        if (options.showArrayIndex === undefined) {
            options.showArrayIndex = true;
        } else {
            options.showArrayIndex = options.showArrayIndex ? true : false;
        }
        return options;
    }
    function validateHyperlinkOptions(options) {
        var hyperlinks = {
            enable: false,
            keys: null,
            target: ""
        };
        if (options.hyperlinks && options.hyperlinks.enable) {
            hyperlinks.enable = true;
            hyperlinks.keys = isArray(options.hyperlinks.keys) ? options.hyperlinks.keys : [];
            if (options.hyperlinks.target) {
                hyperlinks.target = "" + options.hyperlinks.target;
            } else {
                hyperlinks.target = "_blank";
            }
        }
        options.hyperlinks = hyperlinks;
        return options;
    }
    function validateBoolOptions(options) {
        if (!options.bool) {
            options.bool = {
                text: {
                    true: "true",
                    false: "false"
                },
                img: {
                    true: "",
                    false: ""
                },
                showImage: false,
                showText: true
            };
        } else {
            var boolOptions = options.bool;
            if (!boolOptions.showText && !boolOptions.showImage) {
                boolOptions.showImage = false;
                boolOptions.showText = true;
            }
            if (boolOptions.showText) {
                if (!boolOptions.text) {
                    boolOptions.text = {
                        true: "true",
                        false: "false"
                    };
                } else {
                    var t = boolOptions.text.true, f = boolOptions.text.false;
                    if (getType(t) != STRING || t === "") {
                        boolOptions.text.true = "true";
                    }
                    if (getType(f) != STRING || f === "") {
                        boolOptions.text.false = "false";
                    }
                }
            }
            if (boolOptions.showImage) {
                if (!boolOptions.img.true && !boolOptions.img.false) {
                    boolOptions.showImage = false;
                }
            }
        }
        return options;
    }
    return {
        format: format
    };
});

(function() {
    "use strict";
    angular.module("flash", []).factory("flash", [ "$rootScope", "$timeout", function($rootScope, $timeout) {
        var messages = [];
        var reset;
        var cleanup = function() {
            $timeout.cancel(reset);
            reset = $timeout(function() {
                messages = [];
            });
        };
        var emit = function(event, url, oldUrl) {
            if (oldUrl && oldUrl.indexOf("/login") != -1) {
                messages = [];
                $rootScope.$emit("flashMessage", undefined, cleanup);
            } else {
                $rootScope.$emit("flashMessage", messages[0], cleanup);
            }
        };
        $rootScope.$on("$locationChangeSuccess", emit);
        var factory = {};
        factory.error = function() {
            [].unshift.call(arguments, "error");
            process.apply(this, arguments);
        };
        factory.success = function() {
            [].unshift.call(arguments, "success");
            process.apply(this, arguments);
        };
        factory.warning = function() {
            [].unshift.call(arguments, "warning");
            process.apply(this, arguments);
        };
        factory.getMessage = function() {
            return messages[0];
        };
        function process() {
            var length = arguments.length;
            if (length < 3) {
                throw new Error("Minimum arguments for Flash is 2 (Title and Body)");
            }
            var obj = {
                type: arguments[0],
                title: arguments[1]
            };
            if (length < 4) {
                obj.message = arguments[2];
            } else {
                obj.messages = [];
                for (var i = 0; i < length - 2; i++) {
                    obj.messages.push(arguments[2 + i]);
                }
            }
            emit(messages = [ obj ]);
        }
        return factory;
    } ]).directive("flashMessage", function() {
        return {
            restrict: "E",
            template: '<div ng-if="type==\'error\'" class="alert alert-danger">' + "<span><h3>{{title}}</h3></span>" + '<p ng-if="message" ng-bind-html="message"></p>' + '<li ng-if="messages" ng-repeat="m in messages"><p ng-bind-html="m"></p></li>' + "</div>" + '<div ng-if="type==\'success\'" class="alert alert-success">' + "<span><h3>{{title}}</h3></span>" + '<p ng-if="message" ng-bind-html="message"></p>' + '<li ng-if="messages" ng-repeat="m in messages"><p ng-bind-html="m"></p></li>' + "</div>" + '<div ng-if="type==\'warning\'" class="alert alert-warning">' + "<span><h3>{{title}}</h3></span>" + '<p ng-if="message" ng-bind-html="message"></p>' + '<li ng-if="messages" ng-repeat="m in messages"><p ng-bind-html="m"></p></li>' + "</div>",
            controller: [ "$scope", "$rootScope", "flash", function($scope, $rootScope, flash) {
                $rootScope.$on("flashMessage", function(event, data, done) {
                    processData(data);
                    done();
                });
                $scope.getMessage = function() {
                    processData(flash.getMessage());
                };
                $scope.getMessage();
                function processData(data) {
                    if (data) {
                        $scope.type = data.type;
                        $scope.title = data.title;
                        $scope.messages = data.messages;
                        $scope.message = data.message;
                    } else {
                        $scope.type = undefined;
                        $scope.title = undefined;
                        $scope.messages = undefined;
                        $scope.message = undefined;
                    }
                }
            } ]
        };
    });
})();

(function() {
    function patchXHR(fnName, newFn) {
        window.XMLHttpRequest.prototype[fnName] = newFn(window.XMLHttpRequest.prototype[fnName]);
    }
    function redefineProp(xhr, prop, fn) {
        try {
            Object.defineProperty(xhr, prop, {
                get: fn
            });
        } catch (e) {}
    }
    if (!window.FileAPI) {
        window.FileAPI = {};
    }
    FileAPI.shouldLoad = window.XMLHttpRequest && !window.FormData || FileAPI.forceLoad;
    if (FileAPI.shouldLoad) {
        var initializeUploadListener = function(xhr) {
            if (!xhr.__listeners) {
                if (!xhr.upload) xhr.upload = {};
                xhr.__listeners = [];
                var origAddEventListener = xhr.upload.addEventListener;
                xhr.upload.addEventListener = function(t, fn) {
                    xhr.__listeners[t] = fn;
                    if (origAddEventListener) origAddEventListener.apply(this, arguments);
                };
            }
        };
        patchXHR("open", function(orig) {
            return function(m, url, b) {
                initializeUploadListener(this);
                this.__url = url;
                try {
                    orig.apply(this, [ m, url, b ]);
                } catch (e) {
                    if (e.message.indexOf("Access is denied") > -1) {
                        this.__origError = e;
                        orig.apply(this, [ m, "_fix_for_ie_crossdomain__", b ]);
                    }
                }
            };
        });
        patchXHR("getResponseHeader", function(orig) {
            return function(h) {
                return this.__fileApiXHR && this.__fileApiXHR.getResponseHeader ? this.__fileApiXHR.getResponseHeader(h) : orig == null ? null : orig.apply(this, [ h ]);
            };
        });
        patchXHR("getAllResponseHeaders", function(orig) {
            return function() {
                return this.__fileApiXHR && this.__fileApiXHR.getAllResponseHeaders ? this.__fileApiXHR.getAllResponseHeaders() : orig == null ? null : orig.apply(this);
            };
        });
        patchXHR("abort", function(orig) {
            return function() {
                return this.__fileApiXHR && this.__fileApiXHR.abort ? this.__fileApiXHR.abort() : orig == null ? null : orig.apply(this);
            };
        });
        patchXHR("setRequestHeader", function(orig) {
            return function(header, value) {
                if (header === "__setXHR_") {
                    initializeUploadListener(this);
                    var val = value(this);
                    if (val instanceof Function) {
                        val(this);
                    }
                } else {
                    this.__requestHeaders = this.__requestHeaders || {};
                    this.__requestHeaders[header] = value;
                    orig.apply(this, arguments);
                }
            };
        });
        patchXHR("send", function(orig) {
            return function() {
                var xhr = this;
                if (arguments[0] && arguments[0].__isFileAPIShim) {
                    var formData = arguments[0];
                    var config = {
                        url: xhr.__url,
                        jsonp: false,
                        cache: true,
                        complete: function(err, fileApiXHR) {
                            xhr.__completed = true;
                            if (!err && xhr.__listeners.load) xhr.__listeners.load({
                                type: "load",
                                loaded: xhr.__loaded,
                                total: xhr.__total,
                                target: xhr,
                                lengthComputable: true
                            });
                            if (!err && xhr.__listeners.loadend) xhr.__listeners.loadend({
                                type: "loadend",
                                loaded: xhr.__loaded,
                                total: xhr.__total,
                                target: xhr,
                                lengthComputable: true
                            });
                            if (err === "abort" && xhr.__listeners.abort) xhr.__listeners.abort({
                                type: "abort",
                                loaded: xhr.__loaded,
                                total: xhr.__total,
                                target: xhr,
                                lengthComputable: true
                            });
                            if (fileApiXHR.status !== undefined) redefineProp(xhr, "status", function() {
                                return fileApiXHR.status === 0 && err && err !== "abort" ? 500 : fileApiXHR.status;
                            });
                            if (fileApiXHR.statusText !== undefined) redefineProp(xhr, "statusText", function() {
                                return fileApiXHR.statusText;
                            });
                            redefineProp(xhr, "readyState", function() {
                                return 4;
                            });
                            if (fileApiXHR.response !== undefined) redefineProp(xhr, "response", function() {
                                return fileApiXHR.response;
                            });
                            var resp = fileApiXHR.responseText || (err && fileApiXHR.status === 0 && err !== "abort" ? err : undefined);
                            redefineProp(xhr, "responseText", function() {
                                return resp;
                            });
                            redefineProp(xhr, "response", function() {
                                return resp;
                            });
                            if (err) redefineProp(xhr, "err", function() {
                                return err;
                            });
                            xhr.__fileApiXHR = fileApiXHR;
                            if (xhr.onreadystatechange) xhr.onreadystatechange();
                            if (xhr.onload) xhr.onload();
                        },
                        progress: function(e) {
                            e.target = xhr;
                            if (xhr.__listeners.progress) xhr.__listeners.progress(e);
                            xhr.__total = e.total;
                            xhr.__loaded = e.loaded;
                            if (e.total === e.loaded) {
                                var _this = this;
                                setTimeout(function() {
                                    if (!xhr.__completed) {
                                        xhr.getAllResponseHeaders = function() {};
                                        _this.complete(null, {
                                            status: 204,
                                            statusText: "No Content"
                                        });
                                    }
                                }, FileAPI.noContentTimeout || 1e4);
                            }
                        },
                        headers: xhr.__requestHeaders
                    };
                    config.data = {};
                    config.files = {};
                    for (var i = 0; i < formData.data.length; i++) {
                        var item = formData.data[i];
                        if (item.val != null && item.val.name != null && item.val.size != null && item.val.type != null) {
                            config.files[item.key] = item.val;
                        } else {
                            config.data[item.key] = item.val;
                        }
                    }
                    setTimeout(function() {
                        if (!FileAPI.hasFlash) {
                            throw 'Adode Flash Player need to be installed. To check ahead use "FileAPI.hasFlash"';
                        }
                        xhr.__fileApiXHR = FileAPI.upload(config);
                    }, 1);
                } else {
                    if (this.__origError) {
                        throw this.__origError;
                    }
                    orig.apply(xhr, arguments);
                }
            };
        });
        window.XMLHttpRequest.__isFileAPIShim = true;
        window.FormData = FormData = function() {
            return {
                append: function(key, val, name) {
                    if (val.__isFileAPIBlobShim) {
                        val = val.data[0];
                    }
                    this.data.push({
                        key: key,
                        val: val,
                        name: name
                    });
                },
                data: [],
                __isFileAPIShim: true
            };
        };
        window.Blob = Blob = function(b) {
            return {
                data: b,
                __isFileAPIBlobShim: true
            };
        };
    }
})();

(function() {
    function isInputTypeFile(elem) {
        return elem[0].tagName.toLowerCase() === "input" && elem.attr("type") && elem.attr("type").toLowerCase() === "file";
    }
    function hasFlash() {
        try {
            var fo = new ActiveXObject("ShockwaveFlash.ShockwaveFlash");
            if (fo) return true;
        } catch (e) {
            if (navigator.mimeTypes["application/x-shockwave-flash"] !== undefined) return true;
        }
        return false;
    }
    function getOffset(obj) {
        var left = 0, top = 0;
        if (window.jQuery) {
            return jQuery(obj).offset();
        }
        if (obj.offsetParent) {
            do {
                left += obj.offsetLeft - obj.scrollLeft;
                top += obj.offsetTop - obj.scrollTop;
                obj = obj.offsetParent;
            } while (obj);
        }
        return {
            left: left,
            top: top
        };
    }
    if (FileAPI.shouldLoad) {
        if (FileAPI.forceLoad) {
            FileAPI.html5 = false;
        }
        if (!FileAPI.upload) {
            var jsUrl, basePath, script = document.createElement("script"), allScripts = document.getElementsByTagName("script"), i, index, src;
            if (window.FileAPI.jsUrl) {
                jsUrl = window.FileAPI.jsUrl;
            } else if (window.FileAPI.jsPath) {
                basePath = window.FileAPI.jsPath;
            } else {
                for (i = 0; i < allScripts.length; i++) {
                    src = allScripts[i].src;
                    index = src.search(/\/ng\-file\-upload[\-a-zA-z0-9\.]*\.js/);
                    if (index > -1) {
                        basePath = src.substring(0, index + 1);
                        break;
                    }
                }
            }
            if (FileAPI.staticPath == null) FileAPI.staticPath = basePath;
            script.setAttribute("src", jsUrl || basePath + "FileAPI.min.js");
            document.getElementsByTagName("head")[0].appendChild(script);
            FileAPI.hasFlash = hasFlash();
        }
        FileAPI.ngfFixIE = function(elem, createFileElemFn, bindAttr, changeFn) {
            if (!hasFlash()) {
                throw 'Adode Flash Player need to be installed. To check ahead use "FileAPI.hasFlash"';
            }
            var makeFlashInput = function() {
                if (elem.attr("disabled")) {
                    elem.$$ngfRefElem.removeClass("js-fileapi-wrapper");
                } else {
                    var fileElem = elem.$$ngfRefElem;
                    if (!fileElem) {
                        fileElem = elem.$$ngfRefElem = createFileElemFn();
                        fileElem.addClass("js-fileapi-wrapper");
                        if (!isInputTypeFile(elem)) {}
                        setTimeout(function() {
                            fileElem.bind("mouseenter", makeFlashInput);
                        }, 10);
                        fileElem.bind("change", function(evt) {
                            fileApiChangeFn.apply(this, [ evt ]);
                            changeFn.apply(this, [ evt ]);
                        });
                    } else {
                        bindAttr(elem.$$ngfRefElem);
                    }
                    if (!isInputTypeFile(elem)) {
                        fileElem.css("position", "absolute").css("top", getOffset(elem[0]).top + "px").css("left", getOffset(elem[0]).left + "px").css("width", elem[0].offsetWidth + "px").css("height", elem[0].offsetHeight + "px").css("filter", "alpha(opacity=0)").css("display", elem.css("display")).css("overflow", "hidden").css("z-index", "900000").css("visibility", "visible");
                    }
                }
            };
            elem.bind("mouseenter", makeFlashInput);
            var fileApiChangeFn = function(evt) {
                var files = FileAPI.getFiles(evt);
                for (var i = 0; i < files.length; i++) {
                    if (files[i].size === undefined) files[i].size = 0;
                    if (files[i].name === undefined) files[i].name = "file";
                    if (files[i].type === undefined) files[i].type = "undefined";
                }
                if (!evt.target) {
                    evt.target = {};
                }
                evt.target.files = files;
                if (evt.target.files !== files) {
                    evt.__files_ = files;
                }
                (evt.__files_ || evt.target.files).item = function(i) {
                    return (evt.__files_ || evt.target.files)[i] || null;
                };
            };
        };
        FileAPI.disableFileInput = function(elem, disable) {
            if (disable) {
                elem.removeClass("js-fileapi-wrapper");
            } else {
                elem.addClass("js-fileapi-wrapper");
            }
        };
    }
})();

if (!window.FileReader) {
    window.FileReader = function() {
        var _this = this, loadStarted = false;
        this.listeners = {};
        this.addEventListener = function(type, fn) {
            _this.listeners[type] = _this.listeners[type] || [];
            _this.listeners[type].push(fn);
        };
        this.removeEventListener = function(type, fn) {
            if (_this.listeners[type]) _this.listeners[type].splice(_this.listeners[type].indexOf(fn), 1);
        };
        this.dispatchEvent = function(evt) {
            var list = _this.listeners[evt.type];
            if (list) {
                for (var i = 0; i < list.length; i++) {
                    list[i].call(_this, evt);
                }
            }
        };
        this.onabort = this.onerror = this.onload = this.onloadstart = this.onloadend = this.onprogress = null;
        var constructEvent = function(type, evt) {
            var e = {
                type: type,
                target: _this,
                loaded: evt.loaded,
                total: evt.total,
                error: evt.error
            };
            if (evt.result != null) e.target.result = evt.result;
            return e;
        };
        var listener = function(evt) {
            if (!loadStarted) {
                loadStarted = true;
                if (_this.onloadstart) _this.onloadstart(constructEvent("loadstart", evt));
            }
            var e;
            if (evt.type === "load") {
                if (_this.onloadend) _this.onloadend(constructEvent("loadend", evt));
                e = constructEvent("load", evt);
                if (_this.onload) _this.onload(e);
                _this.dispatchEvent(e);
            } else if (evt.type === "progress") {
                e = constructEvent("progress", evt);
                if (_this.onprogress) _this.onprogress(e);
                _this.dispatchEvent(e);
            } else {
                e = constructEvent("error", evt);
                if (_this.onerror) _this.onerror(e);
                _this.dispatchEvent(e);
            }
        };
        this.readAsArrayBuffer = function(file) {
            FileAPI.readAsBinaryString(file, listener);
        };
        this.readAsBinaryString = function(file) {
            FileAPI.readAsBinaryString(file, listener);
        };
        this.readAsDataURL = function(file) {
            FileAPI.readAsDataURL(file, listener);
        };
        this.readAsText = function(file) {
            FileAPI.readAsText(file, listener);
        };
    };
}

if (window.XMLHttpRequest && !(window.FileAPI && FileAPI.shouldLoad)) {
    window.XMLHttpRequest.prototype.setRequestHeader = function(orig) {
        return function(header, value) {
            if (header === "__setXHR_") {
                var val = value(this);
                if (val instanceof Function) {
                    val(this);
                }
            } else {
                orig.apply(this, arguments);
            }
        };
    }(window.XMLHttpRequest.prototype.setRequestHeader);
}

var ngFileUpload = angular.module("ngFileUpload", []);

ngFileUpload.version = "5.0.9";

ngFileUpload.service("Upload", [ "$http", "$q", "$timeout", function($http, $q, $timeout) {
    function sendHttp(config) {
        config.method = config.method || "POST";
        config.headers = config.headers || {};
        var deferred = $q.defer();
        var promise = deferred.promise;
        config.headers.__setXHR_ = function() {
            return function(xhr) {
                if (!xhr) return;
                config.__XHR = xhr;
                if (config.xhrFn) config.xhrFn(xhr);
                xhr.upload.addEventListener("progress", function(e) {
                    e.config = config;
                    if (deferred.notify) {
                        deferred.notify(e);
                    } else if (promise.progressFunc) {
                        $timeout(function() {
                            promise.progressFunc(e);
                        });
                    }
                }, false);
                xhr.upload.addEventListener("load", function(e) {
                    if (e.lengthComputable) {
                        e.config = config;
                        if (deferred.notify) {
                            deferred.notify(e);
                        } else if (promise.progressFunc) {
                            $timeout(function() {
                                promise.progressFunc(e);
                            });
                        }
                    }
                }, false);
            };
        };
        $http(config).then(function(r) {
            deferred.resolve(r);
        }, function(e) {
            deferred.reject(e);
        }, function(n) {
            deferred.notify(n);
        });
        promise.success = function(fn) {
            promise.then(function(response) {
                fn(response.data, response.status, response.headers, config);
            });
            return promise;
        };
        promise.error = function(fn) {
            promise.then(null, function(response) {
                fn(response.data, response.status, response.headers, config);
            });
            return promise;
        };
        promise.progress = function(fn) {
            promise.progressFunc = fn;
            promise.then(null, null, function(update) {
                fn(update);
            });
            return promise;
        };
        promise.abort = function() {
            if (config.__XHR) {
                $timeout(function() {
                    config.__XHR.abort();
                });
            }
            return promise;
        };
        promise.xhr = function(fn) {
            config.xhrFn = function(origXhrFn) {
                return function() {
                    if (origXhrFn) origXhrFn.apply(promise, arguments);
                    fn.apply(promise, arguments);
                };
            }(config.xhrFn);
            return promise;
        };
        return promise;
    }
    this.upload = function(config) {
        function addFieldToFormData(formData, val, key) {
            if (val !== undefined) {
                if (angular.isDate(val)) {
                    val = val.toISOString();
                }
                if (angular.isString(val)) {
                    formData.append(key, val);
                } else if (config.sendFieldsAs === "form") {
                    if (angular.isObject(val)) {
                        for (var k in val) {
                            if (val.hasOwnProperty(k)) {
                                addFieldToFormData(formData, val[k], key + "[" + k + "]");
                            }
                        }
                    } else {
                        formData.append(key, val);
                    }
                } else {
                    val = angular.isString(val) ? val : JSON.stringify(val);
                    if (config.sendFieldsAs === "json-blob") {
                        formData.append(key, new Blob([ val ], {
                            type: "application/json"
                        }));
                    } else {
                        formData.append(key, val);
                    }
                }
            }
        }
        config.headers = config.headers || {};
        config.headers["Content-Type"] = undefined;
        config.transformRequest = config.transformRequest ? angular.isArray(config.transformRequest) ? config.transformRequest : [ config.transformRequest ] : [];
        config.transformRequest.push(function(data) {
            var formData = new FormData();
            var allFields = {};
            var key;
            for (key in config.fields) {
                if (config.fields.hasOwnProperty(key)) {
                    allFields[key] = config.fields[key];
                }
            }
            if (data) allFields.data = data;
            for (key in allFields) {
                if (allFields.hasOwnProperty(key)) {
                    var val = allFields[key];
                    if (config.formDataAppender) {
                        config.formDataAppender(formData, key, val);
                    } else {
                        addFieldToFormData(formData, val, key);
                    }
                }
            }
            if (config.files != null) {
                var fileFormName = config.fileFormDataName || "file";
                if (angular.isArray(config.files)) {
                    var isFileFormNameString = angular.isString(fileFormName);
                    for (var i = 0; i < config.files.length; i++) {
                        formData.append(isFileFormNameString ? fileFormName : fileFormName[i], config.files[i], config.fileName && config.fileName[i] || config.files[i].name);
                    }
                } else {
                    formData.append(fileFormName, config.files, config.fileName || config.file.name);
                }
            }
            return formData;
        });
        return sendHttp(config);
    };
    this.http = function(config) {
        config.transformRequest = config.transformRequest || function(data) {
            if (window.ArrayBuffer && data instanceof window.ArrayBuffer || data instanceof Blob) {
                return data;
            }
            return $http.defaults.transformRequest[0](arguments);
        };
        return sendHttp(config);
    };
} ]);

(function() {
    ngFileUpload.directive("ngfSelect", [ "$parse", "$timeout", "$compile", function($parse, $timeout, $compile) {
        return {
            restrict: "AEC",
            require: "?ngModel",
            link: function(scope, elem, attr, ngModel) {
                linkFileSelect(scope, elem, attr, ngModel, $parse, $timeout, $compile);
            }
        };
    } ]);
    function linkFileSelect(scope, elem, attr, ngModel, $parse, $timeout, $compile) {
        if (elem.attr("__ngf_gen__")) {
            return;
        }
        scope.$on("$destroy", function() {
            if (elem.$$ngfRefElem) elem.$$ngfRefElem.remove();
        });
        var disabled = false;
        if (attr.ngfSelect.search(/\W+$files\W+/) === -1) {
            scope.$watch(attr.ngfSelect, function(val) {
                disabled = val === false;
            });
        }
        function isInputTypeFile() {
            return elem[0].tagName.toLowerCase() === "input" && attr.type && attr.type.toLowerCase() === "file";
        }
        var isUpdating = false;
        function changeFn(evt) {
            if (!isUpdating) {
                isUpdating = true;
                try {
                    var fileList = evt.__files_ || evt.target && evt.target.files;
                    var files = [], rejFiles = [];
                    for (var i = 0; i < fileList.length; i++) {
                        var file = fileList.item(i);
                        if (validate(scope, $parse, attr, file, evt)) {
                            files.push(file);
                        } else {
                            rejFiles.push(file);
                        }
                    }
                    updateModel($parse, $timeout, scope, ngModel, attr, attr.ngfChange || attr.ngfSelect, files, rejFiles, evt);
                    if (files.length === 0) evt.target.value = files;
                } finally {
                    isUpdating = false;
                }
            }
        }
        function bindAttrToFileInput(fileElem) {
            if (attr.ngfMultiple) fileElem.attr("multiple", $parse(attr.ngfMultiple)(scope));
            if (attr.ngfCapture) fileElem.attr("capture", $parse(attr.ngfCapture)(scope));
            if (attr.accept) fileElem.attr("accept", attr.accept);
            for (var i = 0; i < elem[0].attributes.length; i++) {
                var attribute = elem[0].attributes[i];
                if (isInputTypeFile() && attribute.name !== "type" || attribute.name !== "type" && attribute.name !== "class" && attribute.name !== "id" && attribute.name !== "style") {
                    fileElem.attr(attribute.name, attribute.value);
                }
            }
        }
        function createFileInput(evt, resetOnClick) {
            if (!resetOnClick && (evt || isInputTypeFile())) return elem.$$ngfRefElem || elem;
            var fileElem = angular.element('<input type="file">');
            bindAttrToFileInput(fileElem);
            if (isInputTypeFile()) {
                elem.replaceWith(fileElem);
                elem = fileElem;
                fileElem.attr("__ngf_gen__", true);
                $compile(elem)(scope);
            } else {
                fileElem.css("visibility", "hidden").css("position", "absolute").css("overflow", "hidden").css("width", "0px").css("height", "0px").css("z-index", "-100000").css("border", "none").css("margin", "0px").css("padding", "0px").attr("tabindex", "-1");
                if (elem.$$ngfRefElem) {
                    elem.$$ngfRefElem.remove();
                }
                elem.$$ngfRefElem = fileElem;
                document.body.appendChild(fileElem[0]);
            }
            return fileElem;
        }
        function resetModel(evt) {
            updateModel($parse, $timeout, scope, ngModel, attr, attr.ngfChange || attr.ngfSelect, [], [], evt, true);
        }
        function clickHandler(evt) {
            if (elem.attr("disabled") || disabled) return false;
            if (evt != null) {
                evt.preventDefault();
                evt.stopPropagation();
            }
            var resetOnClick = $parse(attr.ngfResetOnClick)(scope) !== false;
            var fileElem = createFileInput(evt, resetOnClick);
            function clickAndAssign(evt) {
                if (evt) {
                    fileElem[0].click();
                }
            }
            if (fileElem) {
                if (!evt || resetOnClick) fileElem.bind("change", changeFn);
                if (evt && resetOnClick && $parse(attr.ngfResetModelOnClick)(scope) !== false) resetModel(evt);
                if (shouldClickLater(navigator.userAgent)) {
                    setTimeout(function() {
                        clickAndAssign(evt);
                    }, 0);
                } else {
                    clickAndAssign(evt);
                }
            }
            return false;
        }
        if (window.FileAPI && window.FileAPI.ngfFixIE) {
            window.FileAPI.ngfFixIE(elem, createFileInput, bindAttrToFileInput, changeFn);
        } else {
            clickHandler();
        }
    }
    function shouldClickLater(ua) {
        var m = ua.match(/Android[^\d]*(\d+)\.(\d+)/);
        if (m && m.length > 2) {
            return parseInt(m[1]) < 4 || parseInt(m[1]) === 4 && parseInt(m[2]) < 4;
        }
        return /.*Windows.*Safari.*/.test(ua);
    }
    ngFileUpload.validate = function(scope, $parse, attr, file, evt) {
        function globStringToRegex(str) {
            if (str.length > 2 && str[0] === "/" && str[str.length - 1] === "/") {
                return str.substring(1, str.length - 1);
            }
            var split = str.split(","), result = "";
            if (split.length > 1) {
                for (var i = 0; i < split.length; i++) {
                    result += "(" + globStringToRegex(split[i]) + ")";
                    if (i < split.length - 1) {
                        result += "|";
                    }
                }
            } else {
                if (str.indexOf(".") === 0) {
                    str = "*" + str;
                }
                result = "^" + str.replace(new RegExp("[.\\\\+*?\\[\\^\\]$(){}=!<>|:\\" + "-]", "g"), "\\$&") + "$";
                result = result.replace(/\\\*/g, ".*").replace(/\\\?/g, ".");
            }
            return result;
        }
        var accept = $parse(attr.ngfAccept)(scope, {
            $file: file,
            $event: evt
        });
        var fileSizeMax = $parse(attr.ngfMaxSize)(scope, {
            $file: file,
            $event: evt
        }) || 9007199254740991;
        var fileSizeMin = $parse(attr.ngfMinSize)(scope, {
            $file: file,
            $event: evt
        }) || -1;
        if (accept != null && angular.isString(accept)) {
            var regexp = new RegExp(globStringToRegex(accept), "gi");
            accept = file.type != null && regexp.test(file.type.toLowerCase()) || file.name != null && regexp.test(file.name.toLowerCase());
        }
        return (accept == null || accept) && (file.size == null || file.size < fileSizeMax && file.size > fileSizeMin);
    };
    ngFileUpload.updateModel = function($parse, $timeout, scope, ngModel, attr, fileChange, files, rejFiles, evt, noDelay) {
        function update() {
            if ($parse(attr.ngfKeep)(scope) === true) {
                var prevFiles = (ngModel.$modelValue || []).slice(0);
                if (!files || !files.length) {
                    files = prevFiles;
                } else if ($parse(attr.ngfKeepDistinct)(scope) === true) {
                    var len = prevFiles.length;
                    for (var i = 0; i < files.length; i++) {
                        for (var j = 0; j < len; j++) {
                            if (files[i].name === prevFiles[j].name) break;
                        }
                        if (j === len) {
                            prevFiles.push(files[i]);
                        }
                    }
                    files = prevFiles;
                } else {
                    files = prevFiles.concat(files);
                }
            }
            if (ngModel) {
                $parse(attr.ngModel).assign(scope, files);
                $timeout(function() {
                    if (ngModel) {
                        ngModel.$setViewValue(files != null && files.length === 0 ? null : files);
                    }
                });
            }
            if (attr.ngModelRejected) {
                $parse(attr.ngModelRejected).assign(scope, rejFiles);
            }
            if (fileChange) {
                $parse(fileChange)(scope, {
                    $files: files,
                    $rejectedFiles: rejFiles,
                    $event: evt
                });
            }
        }
        if (noDelay) {
            update();
        } else {
            $timeout(function() {
                update();
            });
        }
    };
    var validate = ngFileUpload.validate;
    var updateModel = ngFileUpload.updateModel;
})();

(function() {
    var validate = ngFileUpload.validate;
    var updateModel = ngFileUpload.updateModel;
    ngFileUpload.directive("ngfDrop", [ "$parse", "$timeout", "$location", function($parse, $timeout, $location) {
        return {
            restrict: "AEC",
            require: "?ngModel",
            link: function(scope, elem, attr, ngModel) {
                linkDrop(scope, elem, attr, ngModel, $parse, $timeout, $location);
            }
        };
    } ]);
    ngFileUpload.directive("ngfNoFileDrop", function() {
        return function(scope, elem) {
            if (dropAvailable()) elem.css("display", "none");
        };
    });
    ngFileUpload.directive("ngfDropAvailable", [ "$parse", "$timeout", function($parse, $timeout) {
        return function(scope, elem, attr) {
            if (dropAvailable()) {
                var fn = $parse(attr.ngfDropAvailable);
                $timeout(function() {
                    fn(scope);
                    if (fn.assign) {
                        fn.assign(scope, true);
                    }
                });
            }
        };
    } ]);
    function linkDrop(scope, elem, attr, ngModel, $parse, $timeout, $location) {
        var available = dropAvailable();
        if (attr.dropAvailable) {
            $timeout(function() {
                if (scope[attr.dropAvailable]) {
                    scope[attr.dropAvailable].value = available;
                } else {
                    scope[attr.dropAvailable] = available;
                }
            });
        }
        if (!available) {
            if ($parse(attr.ngfHideOnDropNotAvailable)(scope) === true) {
                elem.css("display", "none");
            }
            return;
        }
        var disabled = false;
        if (attr.ngfDrop.search(/\W+$files\W+/) === -1) {
            scope.$watch(attr.ngfDrop, function(val) {
                disabled = val === false;
            });
        }
        var leaveTimeout = null;
        var stopPropagation = $parse(attr.ngfStopPropagation);
        var dragOverDelay = 1;
        var actualDragOverClass;
        elem[0].addEventListener("dragover", function(evt) {
            if (elem.attr("disabled") || disabled) return;
            evt.preventDefault();
            if (stopPropagation(scope)) evt.stopPropagation();
            if (navigator.userAgent.indexOf("Chrome") > -1) {
                var b = evt.dataTransfer.effectAllowed;
                evt.dataTransfer.dropEffect = "move" === b || "linkMove" === b ? "move" : "copy";
            }
            $timeout.cancel(leaveTimeout);
            if (!scope.actualDragOverClass) {
                actualDragOverClass = calculateDragOverClass(scope, attr, evt);
            }
            elem.addClass(actualDragOverClass);
        }, false);
        elem[0].addEventListener("dragenter", function(evt) {
            if (elem.attr("disabled") || disabled) return;
            evt.preventDefault();
            if (stopPropagation(scope)) evt.stopPropagation();
        }, false);
        elem[0].addEventListener("dragleave", function() {
            if (elem.attr("disabled") || disabled) return;
            leaveTimeout = $timeout(function() {
                elem.removeClass(actualDragOverClass);
                actualDragOverClass = null;
            }, dragOverDelay || 1);
        }, false);
        elem[0].addEventListener("drop", function(evt) {
            if (elem.attr("disabled") || disabled) return;
            evt.preventDefault();
            if (stopPropagation(scope)) evt.stopPropagation();
            elem.removeClass(actualDragOverClass);
            actualDragOverClass = null;
            extractFiles(evt, function(files, rejFiles) {
                updateModel($parse, $timeout, scope, ngModel, attr, attr.ngfChange || attr.ngfDrop, files, rejFiles, evt);
            }, $parse(attr.ngfAllowDir)(scope) !== false, attr.multiple || $parse(attr.ngfMultiple)(scope));
        }, false);
        function calculateDragOverClass(scope, attr, evt) {
            var accepted = true;
            var items = evt.dataTransfer.items;
            if (items != null) {
                for (var i = 0; i < items.length && accepted; i++) {
                    accepted = accepted && (items[i].kind === "file" || items[i].kind === "") && validate(scope, $parse, attr, items[i], evt);
                }
            }
            var clazz = $parse(attr.ngfDragOverClass)(scope, {
                $event: evt
            });
            if (clazz) {
                if (clazz.delay) dragOverDelay = clazz.delay;
                if (clazz.accept) clazz = accepted ? clazz.accept : clazz.reject;
            }
            return clazz || attr.ngfDragOverClass || "dragover";
        }
        function extractFiles(evt, callback, allowDir, multiple) {
            var files = [], rejFiles = [], items = evt.dataTransfer.items, processing = 0;
            function addFile(file) {
                if (validate(scope, $parse, attr, file, evt)) {
                    files.push(file);
                } else {
                    rejFiles.push(file);
                }
            }
            function traverseFileTree(files, entry, path) {
                if (entry != null) {
                    if (entry.isDirectory) {
                        var filePath = (path || "") + entry.name;
                        addFile({
                            name: entry.name,
                            type: "directory",
                            path: filePath
                        });
                        var dirReader = entry.createReader();
                        var entries = [];
                        processing++;
                        var readEntries = function() {
                            dirReader.readEntries(function(results) {
                                try {
                                    if (!results.length) {
                                        for (var i = 0; i < entries.length; i++) {
                                            traverseFileTree(files, entries[i], (path ? path : "") + entry.name + "/");
                                        }
                                        processing--;
                                    } else {
                                        entries = entries.concat(Array.prototype.slice.call(results || [], 0));
                                        readEntries();
                                    }
                                } catch (e) {
                                    processing--;
                                    console.error(e);
                                }
                            }, function() {
                                processing--;
                            });
                        };
                        readEntries();
                    } else {
                        processing++;
                        entry.file(function(file) {
                            try {
                                processing--;
                                file.path = (path ? path : "") + file.name;
                                addFile(file);
                            } catch (e) {
                                processing--;
                                console.error(e);
                            }
                        }, function() {
                            processing--;
                        });
                    }
                }
            }
            if (items && items.length > 0 && $location.protocol() !== "file") {
                for (var i = 0; i < items.length; i++) {
                    if (items[i].webkitGetAsEntry && items[i].webkitGetAsEntry() && items[i].webkitGetAsEntry().isDirectory) {
                        var entry = items[i].webkitGetAsEntry();
                        if (entry.isDirectory && !allowDir) {
                            continue;
                        }
                        if (entry != null) {
                            traverseFileTree(files, entry);
                        }
                    } else {
                        var f = items[i].getAsFile();
                        if (f != null) addFile(f);
                    }
                    if (!multiple && files.length > 0) break;
                }
            } else {
                var fileList = evt.dataTransfer.files;
                if (fileList != null) {
                    for (var j = 0; j < fileList.length; j++) {
                        addFile(fileList.item(j));
                        if (!multiple && files.length > 0) {
                            break;
                        }
                    }
                }
            }
            var delays = 0;
            (function waitForProcess(delay) {
                $timeout(function() {
                    if (!processing) {
                        if (!multiple && files.length > 1) {
                            i = 0;
                            while (files[i].type === "directory") i++;
                            files = [ files[i] ];
                        }
                        callback(files, rejFiles);
                    } else {
                        if (delays++ * 10 < 20 * 1e3) {
                            waitForProcess(10);
                        }
                    }
                }, delay || 0);
            })();
        }
    }
    ngFileUpload.directive("ngfSrc", [ "$parse", "$timeout", function($parse, $timeout) {
        return {
            restrict: "AE",
            link: function(scope, elem, attr) {
                if (window.FileReader) {
                    scope.$watch(attr.ngfSrc, function(file) {
                        if (file && validate(scope, $parse, attr, file, null) && (!window.FileAPI || navigator.userAgent.indexOf("MSIE 8") === -1 || file.size < 2e4) && (!window.FileAPI || navigator.userAgent.indexOf("MSIE 9") === -1 || file.size < 4e6)) {
                            $timeout(function() {
                                var URL = window.URL || window.webkitURL;
                                if (URL && URL.createObjectURL) {
                                    elem.attr("src", URL.createObjectURL(file));
                                } else {
                                    var fileReader = new FileReader();
                                    fileReader.readAsDataURL(file);
                                    fileReader.onload = function(e) {
                                        $timeout(function() {
                                            elem.attr("src", e.target.result);
                                        });
                                    };
                                }
                            });
                        } else {
                            elem.attr("src", attr.ngfDefaultSrc || "");
                        }
                    });
                }
            }
        };
    } ]);
    function dropAvailable() {
        var div = document.createElement("div");
        return "draggable" in div && "ondrop" in div;
    }
})();
//# sourceMappingURL=ri-backoffice-angular-libs.min.temp.js.map