define([
    'specimenTools/_BaseWidget'
  , 'specimenTools/services/dom-tool'
], function(
    Parent
  , domTool
) {
    "use strict";

    /* jshint esnext:true*/

    function CharSetInfo(container, pubSub, fontsData, webFontProvider, options) {
        Parent.call(this, options);
        this._container = container;
        this._pubSub = pubSub;
        this._fontsData = fontsData;
        this._webFontProvider = webFontProvider;
        this._pubSub.subscribe('activateFont', this._onActivateFont.bind(this));

        this._bluePrintNodes = this._getBluePrintNodes(
                                this._options.bluePrintNodeClass, true);

        this._createdElements = null;
    }
    var _p = CharSetInfo.prototype = Object.create(Parent.prototype);
    _p.constructor = CharSetInfo;

    CharSetInfo.defaultOptions = {
        isLax: false
      , bluePrintNodeClass: 'charset-info__item-blueprint'
      , itemContentContainerClass: 'charset-info__item-content-container'
      , itemClass: 'charset-info__item'
      , itemCharsetNameClass: 'charset-info__item__charset-name'
      , itemLanguageClass: 'charset-info__item__language'
      , itemIncludedCharsetClass: 'charset-info__item__included-charset'
      , itemSampleCharClass: 'charset-info__item__sample-char'
    };


    _p._getBluePrintNodes = function(className) {
        var nodes = this._container.getElementsByClassName(className)
          , i, l, node
          , result = []
          ;

        if(nodes.length) {
            for(i=0,l=nodes.length;i<l;i++) {
                // I expect the blueprint class to be "display: none"
                node = nodes[i].cloneNode(true);
                node.style.display = null;
                this._applyClasses(node, className, true);
                result.push([nodes[i], node]);
            }
        }
        return result;
    };

    _p._renderCharSetInfo = function(fontIndex, bluePrintNode, charSetInfo
                                                                , isLax) {
        /*jshint unused:vars*/
        var element = bluePrintNode.cloneNode(true);

        // once per found item
        domTool.mapToClass(element, this._options.itemCharsetNameClass
                                                    , function(item, i) {
            /*jshint unused:vars, validthis:true*/
            item.textContent = charSetInfo.name;
        }, this, false);

        // repeated for each included charset per found item
        domTool.mapToClass(element, this._options.itemIncludedCharsetClass
                                                    , function(item, i) {
            /*jshint unused:vars, validthis:true*/
            // no need for deep cloning, we'll set newNode.textContent
            var j, l, newNode;
            for(j=0,l=charSetInfo.includedCharSets.length;j<l;j++) {
                newNode = item.cloneNode(false);
                newNode.style.display = null;
                newNode.textContent = charSetInfo.includedCharSets[j];
                item.parentNode.insertBefore(newNode, item);
            }
            item.parentNode.removeChild(item);
        }, this, false);

        // repeated for each language per found item
        domTool.mapToClass(element, this._options.itemLanguageClass
                                                    , function(item, i) {
            /*jshint unused:vars, validthis:true*/
            // no need for deep cloning, we'll set newNode.textContent
            var filter2key = {
                    'own-languages': 'ownLanguages'
                  , 'inherited-languages': 'inheritedLanguages'
                  , 'all-languages': 'allLanguages'
                }
              , filter, langsKey, j, l, newNode, languages
              ;
            filter = item.getAttribute('data-filter');
            filter = filter in filter2key ? filter : 'all-languages';
            langsKey =  filter2key[filter];
            languages = charSetInfo[langsKey];

            for(j=0,l=languages.length;j<l;j++) {
                newNode = item.cloneNode(false);
                newNode.style.display = null;
                newNode.textContent = languages[j];
                item.parentNode.insertBefore(newNode, item);
            }
            item.parentNode.removeChild(item);
        }, this, false);

        // repeated for each sample char per found item
        domTool.mapToClass(element, this._options.itemSampleCharClass
                                                    , function(item, i) {
            /*jshint unused:vars, validthis:true*/
            // no need for deep cloning, we'll set newNode.textContent
            var j, l, newNode
              , laxSkipped = charSetInfo.laxSkipped.length
                            ? new Set(charSetInfo.laxSkipped)
                            : null
              ;
            for(j=0,l=charSetInfo.charset.length;j<l;j++) {
                // In lax mode, we must skip chars that are not in the
                // font to prevent tofu or printer's pie here.
                if(laxSkipped && laxSkipped.has(charSetInfo.charset.codePointAt(j)))
                    continue;
                newNode = item.cloneNode(false);
                newNode.style.display = null;
                newNode.textContent = charSetInfo.charset[j];
                this._webFontProvider.setStyleOfElement(fontIndex, newNode);
                item.parentNode.insertBefore(newNode, item);
            }
            item.parentNode.removeChild(item);
        }, this, false);

        return element;
    };


    _p._renderToBlueprintNode = function(fontIndex, insertionMarker
                                        , bluePrintNode, data, isLax) {
        var created = []
          , element
          , i, l
          ;

        for(i=0,l=data.length;i<l;i++) {
            element = this._renderCharSetInfo(fontIndex, bluePrintNode, data[i], isLax);
            // insert at blueprint node position
            insertionMarker.parentNode.insertBefore(element
                                                    , insertionMarker);
            created.push(element);
        }
        return created;
    };

    _p._render = function (fontIndex, data, isLax) {
        var i, l, insertionMarker, bluePrintNode
          , result
          , created = []
          ;
        for(i=0,l=this._bluePrintNodes.length;i<l;i++) {
            insertionMarker = this._bluePrintNodes[i][0];
            bluePrintNode = this._bluePrintNodes[i][1];
            result = this._renderToBlueprintNode(fontIndex, insertionMarker
                                            , bluePrintNode, data, isLax);
            Array.prototype.push.apply(created, result);
        }
        return created;
    };

    _p._onActivateFont = function(fontIndex) {
        var isLax, func, data, i, l;
        if(this._createdElements !== null) {
            for(i=0,l=this._createdElements.length;i<l;i++)
                this._createdElements[i].parentNode
                                .removeChild(this._createdElements[i]);
            this._createdElements = null;
        }
        isLax = this._options.isLax
                    || this._container.hasAttribute('data-coverage-lax');
        if(this._container.hasAttribute('data-charset-full'))
            func = 'getFullCharSetsInfo'
        else
            func = isLax
                ? 'getCharSetsInfoLax'
                : 'getCharSetsInfoStrict'
                ;
        data = this._fontsData[func](fontIndex);
        this._createdElements = this._render(fontIndex, data, isLax);
    };

    return CharSetInfo;
});
