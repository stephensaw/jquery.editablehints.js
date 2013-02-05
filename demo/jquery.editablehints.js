/*
 * Editable Hints jQuery Plugin
 * @author Stephen Saw
 * @version 0.1
 *
 * Copyright (c) 2013 Stephen Saw <stephen@stephensaw.me>
 * Released under the MIT License <http://www.opensource.org/licenses/mit-license.php>
 */
( function ( $ ) {
    $.editablehints = function ( options ) {
        var me = this,
            hintsBox,
            hintsCollection = [],
            triggerPos = -1,
            editor,
            isHinting = false;

        //default settings
        var settings = $.extend({
            'editor': null,
            'hints': [],
            'className': 'editablehints',
            'trigger': '@',
            'hintsBoxOffsetX': 0,
            'hintsBoxOffsetY': 0
        }, options);

        if ( typeof options.editor === 'string' ) {
            if ( options.editor.indexOf( '#' ) === 0 )
                settings.editor = $( options.editor );
            else
                settings.editor = $( '#' + options.editor );
        }
        else
            settings.editor = options.editor;

        if ( !settings.editor )
            throw 'Editor is undefined';

        editor = $( settings.editor) ;

        //get selection
        this.getSelection = function() {
            if ( window.getSelection ) {
                return document.getSelection();
            } else if ( document.selection && document.selection.createRange ) {
                return document.selection;
            }
        };

        //get the caret position in text
        this.getCaretPosition = function() {
            var selection, range;

            if ( window.getSelection ) {
                selection = document.getSelection();
                range = selection.getRangeAt( 0 );
                
                return range.startOffset;
            } else if ( document.selection && document.selection.createRange ) {
                range = document.selection.createRange();
                
                var textRange = document.body.createTextRange();
                
                textRange.moveToElementText( document.body );
                textRange.setEndPoint( 'EndToEnd', range );
   
                return textRange.text.length;
            } else
                throw 'Implementation not supported';
        };

        //calculate offset
        this.getOffset = function( el ) {
            var _x   = 0,
                _y   = 0,
                _top;

            while( el && !isNaN( el.offsetLeft ) && !isNaN( el.offsetTop ) ) {
                _top = document.documentElement.scrollTop || el.scrollTop;
                _x += el.offsetLeft - el.scrollLeft;
                _y += el.offsetTop - _top;
                el = el.offsetParent;
            }

            return { top: _y, left: _x };
        };

        //get cursor coords
        this.getCursorPosition = function () {
            var selection, range, newRange, offset;

            if ( window.getSelection ) {
                selection = document.getSelection();
                range = selection.getRangeAt( 0 );
                newRange = document.createRange();
                $span = $( "<span/>" ).css('position', 'absolute');

                newRange.setStart( selection.focusNode, range.endOffset );
                newRange.insertNode( $span[0] );
                
                offset = me.getOffset( $span[0] );

                $span.remove();

                return { x: offset.left, y: offset.top };
            } else if ( document.selection && document.selection.createRange ) {
                var node   = me.getSelectedNode();
                
                offset = me.getOffset( node );

                return { x: offset.left, y: offset.top };
            } else
                throw 'Implementation not supported';
        };

        //get the selected node in the editor
        this.getSelectedNode = function() {
            var selection;

            if ( window.getSelection ) {
                selection = document.getSelection();

                if ( selection.anchorNode )
                    return selection.anchorNode;
            } else if ( document.selection && document.selection.createRange ) {
                selection = document.selection.createRange();

                if ( selection.parentElement )
                    return selection.parentElement();
            } else
                throw 'Implementation not supported';
        };

        //select text in editor using position
        this.selectText = function( node, startPos, endPos, updateUI ) {
            var range;

            if ( startPos < 0 )
                return { text: '', range: null };

            if ( document.getSelection ) {
                var selection = document.getSelection();

                range = document.createRange();
                range.setStart( node, startPos );
                range.setEnd( node, endPos );

                if ( updateUI ) {
                    selection.removeAllRanges();
                    selection.addRange( range );
                }

                var data = selection.anchorNode.data;

                if ( data )
                    return { text: data.substr( startPos, endPos ), range: range };
                else
                    return { text: '', range: null };

            } else if ( document.selection && document.selection.createRange ) {
                var selectedText,
                    moveUnit;

                if ( startPos >= endPos )
                    moveUnit = -1;
                else
                    moveUnit = startPos - endPos;

                range = document.selection.createRange();

                range.moveStart( 'character', moveUnit );
                range.select();

                selectedText = range.text;

                range.collapse( false );
                range.select();

                return { text: selectedText, range: null };
            } else
                throw 'Implementation not supported';
        };

        //suggest the matched words
        this.hints = function( keyword ) {
            hintsCollection = [];

            $.each( settings.hints, function ( index, obj ) {
                if ( obj && obj.text.toLowerCase().indexOf( keyword.toLowerCase() ) === 0 ) {
                    hintsCollection.push( obj );
                }
            });

            me.renderHints( hintsCollection );
        };
        
        //replace the keyword with the value
        this.replaceKeyword = function( value ) {
            var caretPosition = me.getCaretPosition(),
                range;

            if ( window.getSelection ) {
                var selectedNode = me.getSelectedNode(),
                    selectedText = me.selectText( selectedNode, triggerPos, caretPosition, true );
                
                if ( selectedText ) {
                    range = selectedText.range;

                    if ( typeof value === 'string' )
                        document.execCommand( 'insertHTML', false, value );
                    else
                        range.insertNode( value );
                }
            } else if ( document.selection && document.selection.createRange ) {
                range = document.selection.createRange();

                range.moveStart( 'character', triggerPos - caretPosition );
                range.select();
                range.text = '';

                if ( range ) {
                    if ( typeof value === 'string' )
                        range.pasteHTML( value );
                    else {
                        var ctrlRange = document.createControlRange();

                        ctrlRange.addElement( value );
                    }
                }
            } else
                throw 'Implementation not supported';
        };

        //select a hint
        //replace keyword with specified HTML string or HTML dom element
        //separate from replaceKeyword for chance of manipulate data, implement in future
        this.selectHint = function( selectedValue ) {
            var index = selectedValue.attr( 'index' );
            me.replaceKeyword( hintsCollection[index].value );

            me.stopHints();
        };

        //get matched suggestion
        this.renderHints = function( hintsCollection ) {
            if ( hintsCollection.length > 0 ) {
                hintsBox.empty();
                
                var ul = $( '<ul tabindex="0"></ul>' );

                $.each( hintsCollection, function( index, obj ) {
                    ul.append( '<li tabindex="-1" index="' + index + '">' + obj.text + '</li>' );
                });

                ul.children( ':first-child' ).addClass( 'selected' );

                var pos = me.getCursorPosition();

                hintsBox.append( ul );
                hintsBox.css( { 'top': pos.y + settings.hintsBoxOffsetY, 'left': pos.x + settings.hintsBoxOffsetX } );
                hintsBox.show();
                isHinting = true;
            } else
                me.stopHints();
        };

        //remove suggestion
        this.stopHints = function() {
            hintsBox.empty();
            hintsBox.hide();
            isHinting = false;
            triggerPos = -1;
        };

        //decide if there is keyword found
        this.doSearch = function() {
            var caretPosition   = me.getCaretPosition(),
                node            = me.getSelectedNode(),
                trigger         = settings.trigger,
                selectedText;

            if ( !isHinting ) {
                if ( triggerPos === -1 )
                    triggerPos = caretPosition - 1;
            }
            
            selectedText = me.selectText( node, triggerPos, caretPosition - triggerPos ).text;

            if ( caretPosition > 0 && selectedText.indexOf( trigger ) === 0 ) {
                isHinting = true;

                var keyword = selectedText;

                me.hints( keyword.substr( 1, keyword.length - 1 ) );
            } else
                me.stopHints();
        };

        var div = $( '<div></div>' ).addClass( settings.className ).appendTo( 'body' );

        hintsBox = div;

        //binding for navigation arrow
        editor.keydown( function( e ) {
            var keycode  = e.keyCode || e.which;

            if ( isHinting ) {
                var hintList = hintsBox.find( 'ul > li.selected' );

                switch ( keycode ) {
                    //left right
                    case 37:
                    case 39:
                        e.preventDefault();
                        break;

                    //up
                    case 38:
                        e.preventDefault();

                        if ( !hintList.is( ':first-child' ) )
                            hintList.removeClass( 'selected' ).prev().addClass( 'selected' ).get(0).scrollIntoView( false );
                        break;
                    //down
                    case 40:
                        e.preventDefault();

                        if ( !hintList.is( ':last-child' ) )
                            hintList.removeClass( 'selected' ).next().addClass( 'selected' ).get(0).scrollIntoView( false );
                        break;
                    //enter
                    case 13:
                        e.preventDefault();

                        me.selectHint( hintList );
                        
                        break;
                    //esc
                    case 27:
                        e.preventDefault();

                        me.stopHints();
                        break;
                }
            }
        });

        //bind the event
        editor.keyup( function( e ) {
            var keycode = e.keyCode || e.which;

            if ( keycode !== 38 && keycode !== 40 && keycode !== 13 && keycode !== 27 && keycode !== 39 && keycode !== 37 )
                setTimeout( me.doSearch, 1 );
        });
    };
})( jQuery );