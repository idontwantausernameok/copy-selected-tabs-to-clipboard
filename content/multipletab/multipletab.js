var MultipleTabService = { 
	PREFROOT : 'extensions.multipletab@piro.sakura.ne.jp',

	tabDragMode : -1,
	TAB_DRAG_MODE_DEFAULT : 0,
	TAB_DRAG_MODE_SELECT  : 1,
	TAB_DRAG_MODE_SWITCH  : 2,

	tabClickMode : -1,
	TAB_CLICK_MODE_DEFAULT : 0,
	TAB_CLICK_MODE_TOGGLE  : 1,

	kSELECTION_STYLE : 'multipletab-selection-style',
	kSELECTED        : 'multipletab-selected',
	kSELECTED_DUPLICATING : 'multipletab-selected-duplicating',
	kREADY_TO_CLOSE  : 'multipletab-ready-to-close',
	kINSERT_BEFORE   : 'multipletab-insertbefore',

	kSELECTION_MENU        : 'multipletab-selection-menu',
	kCONTEXT_MENU_TEMPLATE : 'multipletab-tabcontext-menu-template',

	selectableItems : [
		{ name : 'clipboard',
		  key  : 'extensions.multipletab.clipboard.formatType' },
		{ name : 'clipboardAll',
		  key  : 'extensions.multipletab.clipboard.formatType' },
		{ name : 'saveTabs',
		  key  : 'extensions.multipletab.saveTabs.saveType' }
	],
	
	NSResolver : { 
		lookupNamespaceURI : function(aPrefix)
		{
			switch (aPrefix)
			{
				case 'xul':
					return 'http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul';
				case 'html':
				case 'xhtml':
					return 'http://www.w3.org/1999/xhtml';
				case 'xlink':
					return 'http://www.w3.org/1999/xlink';
				default:
					return '';
			}
		}
	},
	evaluateXPath : function(aExpression, aContext, aType)
	{
		if (!aType) aType = XPathResult.ORDERED_NODE_SNAPSHOT_TYPE;
		try {
			var doc = aContext.ownerDocument || aContext || document;
			var xpathResult = doc.evaluate(
					aExpression,
					aContext || document,
					this.NSResolver,
					aType,
					null
				);
		}
		catch(e) {
			return {
				singleNodeValue : null,
				snapshotLength  : 0,
				snapshotItem    : function() {
					return null
				}
			};
		}
		return xpathResult;
	},
 
	get SessionStore() { 
		if (!this._SessionStore) {
			this._SessionStore = Components.classes['@mozilla.org/browser/sessionstore;1'].getService(Components.interfaces.nsISessionStore);
		}
		return this._SessionStore;
	},
	_SessionStore : null,
 
/* Utilities */ 
	
	isEventFiredOnTabIcon : function(aEvent) 
	{
		return this.evaluateXPath(
				'ancestor-or-self::*[@class="tab-icon"]',
				aEvent.originalTarget || aEvent.target,
				XPathResult.FIRST_ORDERED_NODE_TYPE
			).singleNodeValue ? true : false ;
	},
 
	getCloseboxFromEvent : function(aEvent) 
	{
		return this.evaluateXPath(
				'ancestor-or-self::*[contains(concat(" ",@class," "), " tab-close-button")]',
				aEvent.originalTarget || aEvent.target,
				XPathResult.FIRST_ORDERED_NODE_TYPE
			).singleNodeValue;
	},
 
	isAccelKeyPressed : function(aEvent) 
	{
		return navigator.platform.toLowerCase().indexOf('mac') > -1 ? aEvent.metaKey : aEvent.ctrlKey ;
	},
 
	isDisabled : function() 
	{
		return (document.getElementById('cmd_CustomizeToolbars').getAttribute('disabled') == 'true');
	},
 
	get browser() 
	{
		return gBrowser;
	},
 
	getArrayFromXPathResult : function(aXPathResult) 
	{
		var max = aXPathResult.snapshotLength;
		var array = new Array(max);
		if (!max) return array;

		for (var i = 0; i < max; i++)
		{
			array[i] = aXPathResult.snapshotItem(i);
		}

		return array;
	},
 
	getSelectedTabs : function(aTabBrowser) 
	{
		return this.getArrayFromXPathResult(this.evaluateXPath(
				'descendant::xul:tab[@'+this.kSELECTED+' = "true"]',
				(aTabBrowser || this.browser).mTabContainer
			));
	},
 
	getReadyToCloseTabs : function(aTabBrowser) 
	{
		return this.getArrayFromXPathResult(this.evaluateXPath(
				'descendant::xul:tab[@'+this.kREADY_TO_CLOSE+' = "true"]',
				(aTabBrowser || this.browser).mTabContainer
			));
	},
 
	getLeftTabsOf : function(aTab) 
	{
		return this.getArrayFromXPathResult(this.evaluateXPath(
				'preceding-sibling::xul:tab',
				aTab
			));
	},
 
	getRightTabsOf : function(aTab) 
	{
		return this.getArrayFromXPathResult(this.evaluateXPath(
				'following-sibling::xul:tab',
				aTab
			));
	},
 
	getSimilarTabsOf : function(aCurrentTab, aTabs) 
	{
		var resultTabs = [];
		if (!aCurrentTab) return resultTabs;

		if (!aTabs)
			aTabs = this.getTabBrowserFromChild(aCurrentTab).mTabContainer.childNodes;

		try {
			var currentDomain = aCurrentTab.linkedBrowser.currentURI.host;
		}
		catch(e) {
			return resultTabs;
		}

		Array.slice(aTabs).forEach(function(aTab) {
			if (aTab == aCurrentTab) return;
			try {
				if (aTab.linkedBrowser.currentURI.host == currentDomain)
					resultTabs.push(aTab);
			}
			catch(e) {
			}
		});
		return resultTabs;
	},
 
	getTabFromEvent : function(aEvent) 
	{
		return this.evaluateXPath(
				'ancestor-or-self::xul:tab[ancestor::xul:tabbrowser]',
				aEvent.originalTarget || aEvent.target,
				XPathResult.FIRST_ORDERED_NODE_TYPE
			).singleNodeValue;
	},
 
	getTabBrowserFromChild : function(aTab) 
	{
		return this.evaluateXPath(
				'ancestor-or-self::xul:tabbrowser',
				aTab,
				XPathResult.FIRST_ORDERED_NODE_TYPE
			).singleNodeValue;
	},
	
	// old method (for backward compatibility) 
	getTabBrowserFromChildren : function(aTab)
	{
		return this.getTabBrowserFromChild(aTab);
	},
  
	get allowMoveMultipleTabs() 
	{
		return this.getPref('extensions.multipletab.tabdrag.moveMultipleTabs');
	},
 
	fireDuplicateEvent : function(aNewTab, aSourceTab, aSourceEvent) 
	{
		var event = document.createEvent('Events');
		event.initEvent('MultipleTabHandler:TabDuplicate', true, false);
		event.sourceTab = aSourceTab;
		event.mayBeMove = aSourceEvent && !this.isAccelKeyPressed(aSourceEvent);
		aNewTab.dispatchEvent(event);
	},
 
	fireWindowMoveEvent : function(aNewTab, aSourceTab) 
	{
		var event = document.createEvent('Events');
		event.initEvent('MultipleTabHandler:TabWindowMove', true, false);
		event.sourceTab = aSourceTab;
		aNewTab.dispatchEvent(event);
	},
 
	createDragFeedbackImage : function(aNode) 
	{
		var tabs = this.getDraggedTabs(aNode);
		if (tabs.length < 2) return null;

		var canvas = document.createElementNS('http://www.w3.org/1999/xhtml', 'canvas');
		var offset = tabs[0].boxObject.height * 0.66;
		var padding = offset * (tabs.length - 1);
		var width = tabs[0].boxObject.width + (padding * 0.66);
		var height = tabs[0].boxObject.height + padding;
		canvas.width = width;
		canvas.height = height;
		try {
			var ctx = canvas.getContext('2d');
			ctx.clearRect(0, 0, width, height);
			tabs.forEach(function(aTab, aIndex) {
				var box = aTab.boxObject;
				ctx.drawWindow(window, box.x, box.y, box.width, box.height, 'transparent');
				ctx.translate(offset * 0.66, offset);
			}, this);
			var image = new Image();
			image.src = canvas.toDataURL()
			return image;
		}
		catch(e) {
			return null;
		}
	},
	getDragFeedbackImageX : function(aNode)
	{
		var tabs = this.getDraggedTabs(aNode);
		if (tabs.length < 2) return 0;
		return 16;
	},
	getDragFeedbackImageY : function(aNode)
	{
		var tabs = this.getDraggedTabs(aNode);
		if (tabs.length < 2) return 0;
		return 16;
	},
	getDraggedTabs : function(aNode)
	{
		var b = this.getTabBrowserFromChild(aNode);
		var tabs = b ? this.getSelectedTabs(b) : [] ;
		return tabs;
	},
 
	filterBlankTabs : function(aTabs) 
	{
		return aTabs.filter(function(aTab) {
				return aTab.linkedBrowser.currentURI.spec != 'about:blank';
			});
	},
  
/* Initializing */ 
	
	init : function() 
	{
		if (!('gBrowser' in window)) return;

		window.addEventListener('mouseup', this, true);

		window.removeEventListener('load', this, false);
		window.addEventListener('unload', MultipleTabService, false);

		this.addPrefListener(this);
		this.observe(null, 'nsPref:changed', 'extensions.multipletab.tabdrag.mode');
		this.observe(null, 'nsPref:changed', 'extensions.multipletab.tabclick.mode');
		this.observe(null, 'nsPref:changed', 'extensions.multipletab.selectionStyle');

/*
		if ('nsDragAndDrop' in window &&
			'startDrag' in nsDragAndDrop) {
			eval('nsDragAndDrop.startDrag = '+nsDragAndDrop.startDrag.toSource().replace(
				/(invokeDragSessionWithImage\([^\)]+,\s*)null\s*,\s*0,\s*0(\s*,[^\)]+\))/,
				'$1MultipleTabService.createDragFeedbackImage(aEvent.target), MultipleTabService.getDragFeedbackImageX(aEvent.target), MultipleTabService.getDragFeedbackImageY(aEvent.target)$2'
			));
		}
*/

		this.initTabBrowser(gBrowser);

		this.overrideExtensionsOnInit(); // hacks.js

		window.setTimeout(function(aSelf) { aSelf.delayedInit(); }, 0, this);
	},
	preInit : function()
	{
		window.removeEventListener('DOMContentLoaded', this, false);

		if ('swapBrowsersAndCloseOther' in document.getElementById('content')) {
			eval('window.BrowserStartup = '+window.BrowserStartup.toSource().replace(
				'gBrowser.swapBrowsersAndCloseOther(gBrowser.selectedTab, uriToLoad);',
				'if (!MultipleTabService.tearOffSelectedTabsFromRemote()) { $& }'
			));
		}

		this.overrideExtensionsOnPreInit(); // hacks.js
	},
	delayedInit : function()
	{
		this.overrideExtensionsOnDelayedInit(); // hacks.js

		if (!('duplicateTab' in gBrowser)) {
			gBrowser.duplicateTab = function(aTab, aSourceEvent) {
				MultipleTabService.duplicateTabs([aTab]);
				MultipleTabService.fireDuplicateEvent(this.mTabContainer.lastChild, aTab, aSourceEvent);
				return this.mTabContainer.lastChild;
			};
		}
	},
	
	initTabBrowser : function(aTabBrowser) 
	{
		aTabBrowser.addEventListener('TabOpen', this, true);
		aTabBrowser.addEventListener('TabClose', this, true);
		aTabBrowser.addEventListener('TabMove', this, true);
		aTabBrowser.addEventListener('MultipleTabHandler:TabDuplicate', this, true);
		aTabBrowser.addEventListener('MultipleTabHandler:TabWindowMove', this, true);
//		aTabBrowser.mTabContainer.addEventListener('dragstart',   this, true);
		aTabBrowser.mTabContainer.addEventListener('draggesture', this, true);
		aTabBrowser.mTabContainer.addEventListener('mouseover',   this, true);
		aTabBrowser.mTabContainer.addEventListener('mousemove',   this, true);
		aTabBrowser.mTabContainer.addEventListener('mousedown',   this, true);

		eval(
			'aTabBrowser.warnAboutClosingTabs = '+
			aTabBrowser.warnAboutClosingTabs.toSource().replace(
				'var numTabs = ', 'var numTabs = this.__multipletab__closedTabsNum || '
			)
		);

/*
		eval(
			'aTabBrowser.onDragStart = '+
			aTabBrowser.onDragStart.toSource().replace(
				'aXferData.data.addDataForFlavour("text/unicode", URI.spec);',
				<><![CDATA[
					var selectedTabs = MultipleTabService.getSelectedTabs(this);
					if (MultipleTabService.isSelected(aEvent.target) &&
						MultipleTabService.allowMoveMultipleTabs) {
						aXferData.data.addDataForFlavour(
							'text/unicode',
							selectedTabs.map(function(aTab) {
								return aTab.linkedBrowser.currentURI.spec;
							}).join('\n')
						);
					}
					else {
						$&
					}
				]]></>
			).replace(
				/(aXferData.data.addDataForFlavour\("text\/html", [^\)]+\);)/,
				<><![CDATA[
					if (MultipleTabService.isSelected(aEvent.target) &&
						MultipleTabService.allowMoveMultipleTabs) {
						aXferData.data.addDataForFlavour(
							'text/html',
							selectedTabs.map(function(aTab) {
								return '<a href="' + aTab.linkedBrowser.currentURI.spec + '">' + aTab.label + '</a>';
							}).join('\n')
						);
					}
					else {
						$1
					}
				]]></>
			)
		);
*/

		if ('duplicateTab' in aTabBrowser) {
			eval(
				'aTabBrowser.duplicateTab = '+
				aTabBrowser.duplicateTab.toSource().replace(
					')',
					', aSourceEvent)'
				).replace(
					'{',
					'{ var newTab;'
				).replace(
					/return /g,
					'newTab = '
				).replace(
					/(\}\)?)$/,
					<><![CDATA[
						MultipleTabService.fireDuplicateEvent(newTab, aTab, aSourceEvent);
						return newTab;
					$1]]></>
				)
			);
		}

		if ('_onDrop' in aTabBrowser && 'swapBrowsersAndCloseOther' in aTabBrowser) {
			eval('aTabBrowser._onDrop = '+aTabBrowser._onDrop.toSource().replace(
				/(this\.swapBrowsersAndCloseOther\([^;]+\);)/,
				'MultipleTabService.fireWindowMoveEvent(newTab, draggedTab); $1'
			));
			aTabBrowser.__multipletab__canDoWindowMove = true;
		}
		else {
			if ('onDrop' in aTabBrowser) {
				eval('aTabBrowser.onDrop = '+aTabBrowser.onDrop.toSource().replace(
					/(this\.duplicateTab\([^\)]+)(\))/g,
					'$1, aEvent$2'
				));
			}
			aTabBrowser.__multipletab__canDoWindowMove = false;
		}

		if ('_onDragEnd' in aTabBrowser) {
			eval('aTabBrowser._onDragEnd = '+aTabBrowser._onDragEnd.toSource().replace(
				'this._replaceTabWithWindow(',
				'if (MultipleTabService.isDraggingAllTabs(draggedTab)) return; $&'
			));
		}

		this.initTabBrowserContextMenu(aTabBrowser);

		var tabs = aTabBrowser.mTabContainer.childNodes;
		for (var i = 0, maxi = tabs.length; i < maxi; i++)
		{
			this.initTab(tabs[i]);
		}

		delete i;
		delete maxi;
		delete tabs;
	},
	
	initTabBrowserContextMenu : function(aTabBrowser) 
	{
		var suffix = '-tabbrowser-'+(aTabBrowser.id || 'instance-'+parseInt(Math.random() * 65000));
		var tabContextMenu = document.getAnonymousElementByAttribute(aTabBrowser, 'anonid', 'tabContextMenu');
		var template = document.getElementById(this.kCONTEXT_MENU_TEMPLATE);
		var items = template.childNodes;
		var item;
		var refNode;
		for (var i = 0, maxi = items.length; i < maxi; i++)
		{
			item = items[i].cloneNode(true);
			if (item.getAttribute('id'))
				item.setAttribute('id', item.getAttribute('id')+suffix);

			try {
				eval('refNode = '+item.getAttribute(this.kINSERT_BEFORE));
			}
			catch(e) {
				refNode = null;
			}

			if (refNode)
				tabContextMenu.insertBefore(item, refNode);
			else
				tabContextMenu.appendChild(item);
		}

		tabContextMenu.addEventListener('popupshowing', this, false);
	},
  
	initTab : function(aTab) 
	{
		aTab.addEventListener('mousemove', this, true);
	},
  
	destroy : function() 
	{
		this.destroyTabBrowser(gBrowser);
		window.addEventListener('mouseup', this, true);

		window.removeEventListener('unload', this, false);

		this.removePrefListener(this);

		var tabs = gBrowser.mTabContainer.childNodes;
		for (var i = 0, maxi = tabs.length; i < maxi; i++)
		{
			this.destroyTab(tabs[i]);
		}

		var tabContextMenu = document.getAnonymousElementByAttribute(gBrowser, 'anonid', 'tabContextMenu');
		tabContextMenu.removeEventListener('popupshowing', this, false);
	},
	
	destroyTabBrowser : function(aTabBrowser) 
	{
		aTabBrowser.removeEventListener('TabOpen', this, true);
		aTabBrowser.removeEventListener('TabClose', this, true);
		aTabBrowser.removeEventListener('TabMove', this, true);
		aTabBrowser.removeEventListener('MultipleTabHandler:TabDuplicate', this, true);
		aTabBrowser.removeEventListener('MultipleTabHandler:TabWindowMove', this, true);
//		aTabBrowser.mTabContainer.removeEventListener('dragstart',   this, true);
		aTabBrowser.mTabContainer.removeEventListener('draggesture', this, true);
		aTabBrowser.mTabContainer.removeEventListener('mouseover',   this, true);
		aTabBrowser.mTabContainer.removeEventListener('mousemove',   this, true);
		aTabBrowser.mTabContainer.removeEventListener('mousedown',   this, true);

		var tabContextMenu = document.getAnonymousElementByAttribute(aTabBrowser, 'anonid', 'tabContextMenu');
		tabContextMenu.removeEventListener('popupshowing', this, false);
	},
 
	destroyTab : function(aTab) 
	{
		this.setSelection(aTab, false);
		if (!this.hasSelection())
			this.selectionModified = false;

		aTab.removeEventListener('mousemove', this, true);
	},
   
/* Event Handling */ 
	
	handleEvent : function(aEvent) 
	{
		switch (aEvent.type)
		{
			case 'mousedown':
				this.lastMouseDownX = aEvent.screenX;
				this.lastMouseDownY = aEvent.screenY;
				this.onTabClick(aEvent);
				break;

//			case 'dragstart':
//				break;

			case 'draggesture':
				this.onTabDragStart(aEvent);
				break;

			case 'mouseup':
				this.onTabDragEnd(aEvent);
				break;

			case 'mouseover':
				this.onTabDragEnter(aEvent);
				break;

			case 'mousemove':
				this.onTabDragOver(aEvent);
				break;

			case 'TabOpen':
				this.initTab(aEvent.originalTarget);
				break;

			case 'TabClose':
				this.destroyTab(aEvent.originalTarget);
				break;

			case 'TabMove':
				if (
					this.isSelected(aEvent.originalTarget) &&
					this.allowMoveMultipleTabs &&
					!aEvent.currentTarget.movingSelectedTabs
					)
					this.moveBundledTabsOf(aEvent.originalTarget, aEvent);
				break;

			case 'MultipleTabHandler:TabDuplicate':
				if (
					this.isSelected(aEvent.sourceTab) &&
					this.allowMoveMultipleTabs &&
					!aEvent.currentTarget.duplicatingSelectedTabs
					)
					this.duplicateBundledTabsOf(aEvent.originalTarget, aEvent.sourceTab, aEvent.mayBeMove);
				break;

			case 'MultipleTabHandler:TabWindowMove':
				if (
					this.isSelected(aEvent.sourceTab) &&
					this.allowMoveMultipleTabs &&
					!aEvent.currentTarget.duplicatingSelectedTabs
					)
					this.windowMoveBundledTabsOf(aEvent.originalTarget, aEvent.sourceTab);
				break;

			case 'DOMContentLoaded':
				this.preInit();
				break;

			case 'load':
				this.init();
				break;

			case 'unload':
				this.destroy();
				break;

			case 'popupshowing':
				if (
					aEvent.target.id != this.kSELECTION_MENU &&
					this.hasSelection()
					) {
					this.showSelectionPopup({
						screenX : this.lastMouseDownX,
						screenY : this.lastMouseDownY,
					});
					aEvent.preventDefault();
					aEvent.stopPropagation();
					return false;
				}
				this.enableMenuItems(aEvent.target);
				this.showHideMenuItems(aEvent.target);
				break;
		}
	},
 
	onTabClick : function(aEvent) 
	{
		if (aEvent.button != 0) return;

		var tab = this.getTabFromEvent(aEvent);
		if (tab) {
			var b = this.getTabBrowserFromChild(tab);
			if (aEvent.shiftKey) {
				var tabs = b.mTabContainer.childNodes;
				var inSelection = false;
				for (var i = 0, maxi = tabs.length; i < maxi; i++)
				{
					if (tabs[i].getAttribute('hidden') == 'true' ||
						tabs[i].getAttribute('collapsed') == 'true')
						continue;

					if (tabs[i] == b.selectedTab ||
						tabs[i] == tab) {
						inSelection = !inSelection;
						this.setSelection(tabs[i], true);
					}
					else {
						this.setSelection(tabs[i], inSelection);
					}
				}
				aEvent.preventDefault();
				aEvent.stopPropagation();
				return;
			}
			else if (this.isAccelKeyPressed(aEvent)) {
				if (this.tabClickMode != this.TAB_CLICK_MODE_TOGGLE) {
					b.removeTab(tab);
					return;
				}

				if (!this.selectionModified && !this.hasSelection())
					this.setSelection(b.selectedTab, true);

				this.toggleSelection(tab);
				aEvent.preventDefault();
				aEvent.stopPropagation();
				return;
			}
			else if (this.tabDragMode != this.TAB_DRAG_MODE_DEFAULT) {
				var delay = this.getPref('extensions.multipletab.tabdrag.delay');
				if (delay > 0) {
					this.cancelDelayedDragStart();
					this.lastMouseDown = Date.now();
					this.delayedDragStartTimer = window.setTimeout(this.delayedDragStart, delay, this, aEvent);
				}
			}
		}
		if (this.selectionModified && !this.hasSelection())
			this.selectionModified = false;

		if (!tab || !this.isSelected(tab) ||
			!this.allowMoveMultipleTabs)
			this.clearSelection();
	},
	
	delayedDragStart : function(aSelf, aEvent) 
	{
		aSelf.clearSelection();
		aSelf.tabDragging = false; // cancel "dragging" before we start to drag it really.
		aSelf.delayedDragStartReady = true;
		aSelf.onTabDragStart(aEvent, true);
	},
	cancelDelayedDragStart : function()
	{
		if (this.delayedDragStartTimer) {
			window.clearTimeout(this.delayedDragStartTimer);
			this.delayedDragStartTimer = null;
		}
	},
	delayedDragStartTimer : null,
  
	onTabDragStart : function(aEvent, aIsTimeout) 
	{
		this.cancelDelayedDragStart();

		var tab = this.getTabFromEvent(aEvent);
		if (!tab) {
			this.lastMouseOverTarget = null;
			return;
		}

		if (
			tab.mOverCloseButton ||
			tab.tmp_mOverCloseButton // Tab Mix Plus
			) {
			this.tabCloseboxDragging = true;
			this.lastMouseOverTarget = this.getCloseboxFromEvent(aEvent);
			this.clearSelectionSub(this.getSelectedTabs(this.getTabBrowserFromChild(tab)), this.kSELECTED);
			this.setReadyToClose(tab, true);
		}
		else if (
			this.isEventFiredOnTabIcon(aEvent) ||
			this.tabDragMode == this.TAB_DRAG_MODE_DEFAULT
			) {
			return;
		}
		else {
			var delay = this.getPref('extensions.multipletab.tabdrag.delay');
			if (
				delay > 0 &&
				(Date.now() - this.lastMouseDown < delay) &&
				!aIsTimeout
				) {
				return
			}
			this.tabDragging = true;
			this.delayedDragStartReady = false;
			this.lastMouseOverTarget = tab;
			if (this.tabDragMode == this.TAB_DRAG_MODE_SELECT)
				this.setSelection(tab, true);
		}

		aEvent.preventDefault();
		aEvent.stopPropagation();
	},
	tabDragging         : false,
	tabCloseboxDragging : false,
	lastMouseOverTarget : null,
	lastMouseDown       : 0,
 
	onTabDragEnd : function(aEvent) 
	{
		this.cancelDelayedDragStart();

		if (this.tabCloseboxDragging) {
			this.tabCloseboxDragging = false;
			this.closeTabs(this.getReadyToCloseTabs());
			this.clearSelection();
		}
		else if (this.delayedDragStartReady) {
			if (this.tabDragMode == this.TAB_DRAG_MODE_SELECT)
				this.clearSelection();
		}
		else if (this.tabDragging) {
			this.tabDragging = false;
			if (this.hasSelection()) {
				if (this.getPref('extensions.multipletab.tabdrag.autopopup'))
					this.showSelectionPopup(aEvent, this.getPref('extensions.multipletab.tabdrag.autoclear'));
			}
			else {
				this.clearSelection();
			}
		}
		this.delayedDragStartReady = false;

		this.lastMouseOverTarget = null;
	},
 
	onTabDragEnter : function(aEvent) 
	{
		if (!(
				this.tabDragging ||
				this.tabCloseboxDragging
			) || this.isDisabled())
			return;

		var b = this.getTabBrowserFromChild(aEvent.originalTarget);
		var arrowscrollbox = b.mTabContainer.mTabstrip;
		if (aEvent.originalTarget == document.getAnonymousElementByAttribute(arrowscrollbox, 'class', 'scrollbutton-up')) {
			arrowscrollbox._startScroll(-1);
		}
		else if (aEvent.originalTarget == document.getAnonymousElementByAttribute(arrowscrollbox, 'class', 'scrollbutton-down')) {
			arrowscrollbox._startScroll(1);
		}
	},
 
	onTabDragOver : function(aEvent) 
	{
		if (!(
				this.tabDragging ||
				this.tabCloseboxDragging
			) || this.isDisabled())
			return;

		if (this.tabDragging) {
			var tab = this.getTabFromEvent(aEvent);
			if (tab == this.lastMouseOverTarget) return;

			if (!tab) {
				this.lastMouseOverTarget = null;
				return;
			}

			this.lastMouseOverTarget = tab;

			switch(this.tabDragMode)
			{
				case this.TAB_DRAG_MODE_SELECT:
					this.toggleSelection(tab);
					break;

				case this.TAB_DRAG_MODE_SWITCH:
					var b = this.getTabBrowserFromChild(tab);
					b.selectedTab = tab;
					break;

				default:
					break;
			}
		}
		else if (this.tabCloseboxDragging) {
			if (aEvent.originalTarget == this.lastMouseOverTarget) return;

			this.lastMouseOverTarget = aEvent.originalTarget;

			if (!this.getCloseboxFromEvent(aEvent)) return;

			var tab = this.getTabFromEvent(aEvent);
			this.toggleReadyToClose(tab);
		}
	},
  
/* Popup */ 
	
	get tabSelectionPopup() { 
		if (!this._tabSelectionPopup) {
			this._tabSelectionPopup = document.getElementById(this.kSELECTION_MENU);
		}
		return this._tabSelectionPopup;
	},
	_tabSelectionPopup : null,
 
	showSelectionPopup : function(aEvent, aAutoClearSelection) 
	{
		var popup = this.tabSelectionPopup;
		popup.hidePopup();
		popup.autoClearSelection = aAutoClearSelection;
		document.popupNode = this.browser.mTabContainer;
		if ('openPopupAtScreen' in popup) // Firefox 3
			popup.openPopupAtScreen(aEvent.screenX, aEvent.screenY, true);
		else
			popup.showPopup(
				document.documentElement,
				aEvent.screenX - document.documentElement.boxObject.screenX,
				aEvent.screenY - document.documentElement.boxObject.screenY,
				'popup'
			);
	},
 
	enableMenuItems : function(aPopup) 
	{
		var tab = this.browser.mContextTab || this.browser.selectedTab;

		try {
			var removeLeft = document.evaluate(
					'descendant::xul:menuitem[starts-with(@id, "multipletab-context-removeLeftTabs")]',
					aPopup,
					this.NSResolver,
					XPathResult.FIRST_ORDERED_NODE_TYPE,
					null
				).singleNodeValue;
			if (removeLeft) {
				if (tab.previousSibling)
					removeLeft.removeAttribute('disabled');
				else
					removeLeft.setAttribute('disabled', true);
			}
		}
		catch(e) {
		}

		try {
			var removeRight = document.evaluate(
					'descendant::xul:menuitem[starts-with(@id, "multipletab-context-removeRightTabs")]',
					aPopup,
					this.NSResolver,
					XPathResult.FIRST_ORDERED_NODE_TYPE,
					null
				).singleNodeValue;
			if (removeRight) {
				if (tab.nextSibling)
					removeRight.removeAttribute('disabled');
				else
					removeRight.setAttribute('disabled', true);
			}
		}
		catch(e) {
		}
	},
 
	showHideMenuItems : function(aPopup) 
	{
		var nodes = aPopup.childNodes;
		var pref;

		var b   = this.getTabBrowserFromChild(aPopup) || this.browser;
		var box = b.mTabContainer.mTabstrip || b.mTabContainer ;
		var isVertical = ((box.getAttribute('orient') || window.getComputedStyle(box, '').getPropertyValue('-moz-box-orient')) == 'vertical');

		var label;
		var key;

		var selectableItemsRegExp = new RegExp(
				'^(multipletab-(?:context|selection)-('+
				this.selectableItems.map(function(aItem) {
					return aItem.name;
				}).join('|')+
				'))(:select)?$'
			);

		var selectType = {};
		this.selectableItems.forEach(function(aItem) {
			selectType[aItem.name] = this.getPref(aItem.key) < 0;
		}, this);

		for (var i = 0, maxi = nodes.length; i < maxi; i++)
		{
			if (
				(isVertical && (label = nodes[i].getAttribute('label-vertical'))) ||
				(!isVertical && (label = nodes[i].getAttribute('label-horizontal')))
				)
				nodes[i].setAttribute('label', label);

			key = nodes[i].getAttribute('id').replace(/-tabbrowser-.*$/, '');
			if (selectableItemsRegExp.test(key)) {
				key  = RegExp.$1
				pref = this.getPref('extensions.multipletab.show.'+key) &&
						(Boolean(RegExp.$3) == selectType[RegExp.$2]);
			}
			else {
				pref = this.getPref('extensions.multipletab.show.'+key);
			}

			if (pref === null) continue;

			if (pref)
				nodes[i].removeAttribute('hidden');
			else
				nodes[i].setAttribute('hidden', true);
		}

		var separators = this.getSeparators(aPopup);
		for (var i = separators.snapshotLength-1; i > -1; i--)
		{
			separators.snapshotItem(i).removeAttribute('hidden');
		}

		var separator;
		while (separator = this.getObsoleteSeparator(aPopup))
		{
			separator.setAttribute('hidden', true);
		}
	},
	
	getSeparators : function(aPopup) 
	{
		try {
			var xpathResult = document.evaluate(
					'descendant::xul:menuseparator',
					aPopup,
					this.NSResolver, // document.createNSResolver(document.documentElement),
					XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
					null
				);
		}
		catch(e) {
			return { snapshotLength : 0 };
		}
		return xpathResult;
	},
 
	getObsoleteSeparator : function(aPopup) 
	{
		try {
			var xpathResult = document.evaluate(
					'descendant::xul:menuseparator[not(@hidden)][not(following-sibling::*[not(@hidden)]) or not(preceding-sibling::*[not(@hidden)]) or local-name(following-sibling::*[not(@hidden)]) = "menuseparator"]',
					aPopup,
					this.NSResolver, // document.createNSResolver(document.documentElement),
					XPathResult.FIRST_ORDERED_NODE_TYPE,
					null
				);
		}
		catch(e) {
			return null;
		}
		return xpathResult.singleNodeValue;
	},
   
/* Commands */ 
	
	closeTabs : function(aTabs) 
	{
		if (!aTabs) return;

		var max = aTabs.length;
		if (!max) return;

		var b = this.getTabBrowserFromChild(aTabs[0]);
		b.__multipletab__closedTabsNum = max;
		if (
			max > 1 &&
			!b.warnAboutClosingTabs(true)
			) {
			b.__multipletab__closedTabsNum = 0;
			return;
		}
		b.__multipletab__closedTabsNum = 0;

		var tabs = Array.slice(aTabs);
		tabs.reverse();
		var selected;
		tabs.forEach(function(aTab) {
			if (aTab.selected)
				selected = aTab;
			else
				b.removeTab(aTab);
		});
		if (selected)
			b.removeTab(selected);
	},
 
	closeSimilarTabsOf : function(aCurrentTab, aTabs) 
	{
		if (!aCurrentTab) return;

		var removeTabs = this.getSimilarTabsOf(aCurrentTab, aTabs);
		var max = removeTabs.length;
		var b   = this.getTabBrowserFromChild(aCurrentTab);
		b.__multipletab__closedTabsNum = max;
		if (
			max > 1 &&
			!b.warnAboutClosingTabs(true)
			) {
			b.__multipletab__closedTabsNum = 0;
			return;
		}
		b.__multipletab__closedTabsNum = 0;

		removeTabs.forEach(function(aTab) {
			b.removeTab(aTab);
		});
	},
 
	reloadTabs : function(aTabs) 
	{
		if (!aTabs) return;

		var b;
		var self = this;
		Array.slice(aTabs).forEach(function(aTab) {
			if (!b) b = self.getTabBrowserFromChild(aTab);
			b.reloadTab(aTab);
		});
	},
 
	saveTabs : function(aTabs, aSaveType) 
	{
		if (!aTabs) return;

		aTabs = this.filterBlankTabs(aTabs);

		if (aSaveType === void(0)) {
			aSaveType = this.getPref('extensions.multipletab.saveTabs.saveType');
		}
		if (aSaveType < 0) {
			aSaveType = this.kSAVE_TYPE_DEFAULT;
		}

		if (aTabs.length == 1) {
			this.saveOneTab(aTabs[0], null, aSaveType);
			return;
		}

		var title = document.getElementById('multipletab-bundle').getString('saveTabs_chooseFolderTitle');
		var folder = this.selectFolder(title);
		if (!folder) return;

		var fileExistence = {};
		aTabs.forEach(function(aTab) {
			var b = aTab.linkedBrowser;
			var destFile = folder.clone();
			var uri = b.currentURI;
			var fileInfo = new FileInfo(aTab.label);
			initFileInfo(
				fileInfo,
				uri.spec,
				b.contentDocument.characterSet,
				b.contentDocument,
				b.contentDocument.contentType,
				null
			);
			var base = fileInfo.fileName;
			var extension = '.'+fileInfo.fileExt;
			var fileName = '';
			var count = 2;
			var existingFile;
			do {
				fileName = fileName ? base+'('+(count++)+')'+extension : base+extension ;
				destFile = folder.clone();
				destFile.append(fileName);
			}
			while (destFile.exists() || destFile.path in fileExistence);
			fileExistence[destFile.path] = true;
			window.setTimeout(function(aSelf, aTab, aDestFile, aSaveType) {
				aSelf.saveOneTab(aTab, aDestFile, aSaveType);
			}, 200, this, aTab, destFile, aSaveType);
		}, this);
	},
	
	kSAVE_TYPE_DEFAULT  : 0, 
	kSAVE_TYPE_COMPLETE : 1,
	kSAVE_TYPE_TEXT     : 2,
 
	selectFolder : function(aTitle) 
	{
		var picker = Components
						.classes['@mozilla.org/filepicker;1']
						.createInstance(Components.interfaces.nsIFilePicker);
		picker.init(window, aTitle, picker.modeGetFolder);
		var downloadDir = this.getPref('browser.download.dir', Components.interfaces.nsILocalFile);
		if (downloadDir) picker.displayDirectory = downloadDir;
		picker.appendFilters(picker.filterAll);
		if (picker.show() == picker.returnOK) {
			return picker.file.QueryInterface(Components.interfaces.nsILocalFile);
		}
		return null;
	},
 
	saveOneTab : function(aTab, aDestFile, aSaveType) 
	{
		var b = aTab.linkedBrowser;
		var uri = b.currentURI;
		var contentType = aSaveType == this.kSAVE_TYPE_COMPLETE ?
					b.contentDocument.contentType :
				 aSaveType == this.kSAVE_TYPE_TEXT ?
				 	'text/plain' :
				 	null ;

		internalSave(
			uri.spec,
			(aSaveType == this.kSAVE_TYPE_COMPLETE ? b.contentDocument : null ),
			null,
			null,
			contentType,
			false,
			null,
			(aDestFile && aSaveType != this.kSAVE_TYPE_TEXT ? new AutoChosen(aDestFile, uri) : null ),
			b.referringURI
		);
	},
  
	addBookmarkFor : function(aTabs) 
	{
		if (!aTabs) return;

		var b = this.getTabBrowserFromChild(aTabs[0]);

		if ('PlacesUIUtils' in window || 'PlacesUtils' in window) { // Firefox 3
			var utils = 'PlacesUIUtils' in window ? PlacesUIUtils : PlacesUtils ;
			utils.showMinimalAddMultiBookmarkUI(Array.slice(aTabs).map(this.addBookmarkTabsFilter));
			return;
		}

		var currentTabInfo;
		var tabsInfo = Array.slice(aTabs).map(function(aTab) {
				var webNav = aTab.linkedBrowser.webNavigation;
				var url    = webNav.currentURI.spec;
				var name   = '';
				var charSet, description;
				try {
					var doc = webNav.document;
					name = doc.title || url;
					charSet = doc.characterSet;
					description = BookmarksUtils.getDescriptionFromDocument(doc);
				}
				catch (e) {
					name = url;
				}
				return {
					name        : name,
					url         : url,
					charset     : charSet,
					description : description
				};
			});

		window.openDialog(
			'chrome://browser/content/bookmarks/addBookmark2.xul',
			'',
			BROWSER_ADD_BM_FEATURES,
			(aTabs.length == 1 ?
				tabsInfo[0] :
				{
					name             : gNavigatorBundle.getString('bookmarkAllTabsDefault'),
					bBookmarkAllTabs : true,
					objGroup         : tabsInfo
				}
			)
		);
	},
	addBookmarkTabsFilter : function(aTab)
	{
		return aTab.linkedBrowser.currentURI;
	},
 
	duplicateTabs : function(aTabs) 
	{
		if (!aTabs) return;

		var max = aTabs.length;
		if (!max) return;

		this.duplicatingTabs = true;

		var b  = this.getTabBrowserFromChild(aTabs[0]);
		var SS = this.SessionStore;
		var self = this;

		var selectedIndex = -1;
		for (var i = max-1; i > -1; i--)
		{
			SS.setTabValue(aTabs[i], this.kSELECTED, 'true');
			if (aTabs[i] == b.selectedTab)
				selectedIndex = i;
		}
		if (selectedIndex > -1) {
			selectedIndex += b.mTabContainer.childNodes.length;
		}

		var state = SS.getWindowState(window);

		// delete obsolete data
		eval('state = '+state);
		delete state.windows[0]._closedTabs;
		for (var i = state.windows[0].tabs.length-1; i > -1; i--)
		{
			if (!state.windows[0].tabs[i].extData ||
				state.windows[0].tabs[i].extData[this.kSELECTED] != 'true') {
				state.windows[0].tabs.splice(i, 1);
				if (i < state.windows[0].selected)
					state.windows[0].selected--;
			}
			else {
				this._clearTabValueKeys.forEach(function(aKey) {
					delete state.windows[0].tabs[i].extData[aKey];
				});
			}
		}
		state = state.toSource();

		this.clearSelection();

		SS.setWindowState(window, state, false);

		if (selectedIndex > -1)
			b.selectedTab = b.mTabContainer.childNodes[selectedIndex];

		var tabs = Array.slice(b.mTabContainer.childNodes).reverse();
		for (var i = 0, maxi = aTabs.length; i < maxi; i++)
		{
			this.setSelection(tabs[i], true);
		}

		window.setTimeout(function(aSelf) {
			aSelf.duplicatingTabs = false;
		}, 0, this);
	},
 
	splitWindowFromTabs : function(aTabs, aWindow) 
	{
		if (!aTabs) return;
		var max = aTabs.length;
		if (!max) return;
		var b  = this.getTabBrowserFromChild(aTabs[0]);

		if (!b.__multipletab__canDoWindowMove) {
			this.splitWindowFromTabsOld(aTabs);
			return;
		}

		var allSelected = true;
		var selectionState = aTabs.map(function(aTab) {
				var selected = this.isSelected(aTab);
				if (!selected) allSelected = false;
				return selected;
			}, this);

		var newWin = aWindow;
		var postProcess = function() {
			newWin.removeEventListener('load', arguments.callee, false);
			newWin.MultipleTabService.duplicatingTabs = true;
			newWin.setTimeout(function() {
				var targetBrowser = newWin.gBrowser;
				var newTabs = [];
				aTabs.forEach(function(aTab, aIndex) {
					var newTab = targetBrowser.addTab();
					newTabs.push(newTab);
					newTab.linkedBrowser.stop();
					newTab.linkedBrowser.docShell;
					targetBrowser.swapBrowsersAndCloseOther(newTab, aTab);
					targetBrowser.setTabTitle(newTab);

					if (!allSelected && selectionState[aIndex])
						newWin.MultipleTabService.setSelection(newTab, true);
				}, this);

				Array.slice(targetBrowser.mTabContainer.childNodes).forEach(function(aTab) {
					if (newTabs.indexOf(aTab) > -1) return;
					try {
						if (aTab.linkedBrowser.sessionHistory)
							aTab.linkedBrowser.sessionHistory.PurgeHistory(aTab.linkedBrowser.sessionHistory.count);
					}
					catch(e) {
						dump(e+'\n');
					}
					aTab.linkedBrowser.contentWindow.location.replace('about:blank');
					targetBrowser.removeTab(aTab);
				});

				newTabs.forEach(function(aTab, aTabIndex) {
					newWin.MultipleTabService._duplicatedTabPostProcesses.forEach(function(aProcess) {
						aProcess(aTab, aTabIndex);
					});
				});

				newWin.MultipleTabService.duplicatingTabs = false;

				delete allSelected;
				delete selectionState;
				delete targetBrowser;
				delete newTabs;
				delete newWin;
			}, 0);
		};

		if (newWin) {
			postProcess();
		}
		else {
			newWin = window.openDialog(location.href, '_blank', 'chrome,all,dialog=no', 'about:blank');
			newWin.addEventListener('load', postProcess, false);
		}
	},
	
	splitWindowFrom : function(aTabs) // old name 
	{
		this.splitWindowFromTabs(aTabs);
	},
  
	splitWindowFromTabsOld : function(aTabs) 
	{
		if (!aTabs) return;

		var max = aTabs.length;
		if (!max) return;


		// Step 1: get window state

		var b  = this.getTabBrowserFromChild(aTabs[0]);
		var SS = this.SessionStore;

		for (var i = max-1; i > -1; i--)
		{
			SS.setTabValue(aTabs[i], this.kSELECTED, 'true');
		}

		var state = SS.getWindowState(window);

		// delete obsolete data
		eval('state = '+state);
		delete state.windows[0]._closedTabs;
		for (var i = state.windows[0].tabs.length-1; i > -1; i--)
		{
			if (!state.windows[0].tabs[i].extData ||
				state.windows[0].tabs[i].extData[this.kSELECTED] != 'true') {
				state.windows[0].tabs.splice(i, 1);
				if (i < state.windows[0].selected)
					state.windows[0].selected--;
			}
			else {
				this._clearTabValueKeys.forEach(function(aKey) {
					delete state.windows[0].tabs[i].extData[aKey];
				});
			}
		}
		state = state.toSource();


		// Step 2: remove obsolete tabs

		var tab;
		for (var i = max-1; i > -1; i--)
		{
			tab = aTabs[i];
			SS.deleteTabValue(tab, this.kSELECTED);
			if (tab.linkedBrowser.sessionHistory)
				tab.linkedBrowser.sessionHistory.PurgeHistory(tab.linkedBrowser.sessionHistory.count);
			tab.linkedBrowser.contentWindow.location.replace('about:blank');
			tab.setAttribute('collapsed', true);
			tab.__multipletab__shouldRemove = true;
		}
		delete tab;

		window.setTimeout(function() {
			var tabs = b.mTabContainer.childNodes;
			for (var i = tabs.length-1; i > -1; i--)
			{
				if (tabs[i].__multipletab__shouldRemove)
					b.removeTab(tabs[i]);
			}
			delete tabs;
			delete b;
			delete i;
		}, 0);

		return this.openNewWindowWithTabs(state, max);
	},
	
	openNewWindowWithTabs : function(aState, aNumTabs) 
	{
		// Step 3: Restore state in new window

		var SS = this.SessionStore;

		var newWin = window.openDialog(location.href, '_blank', 'chrome,all,dialog=no', 'about:blank');
		var key = this.kSELECTED;
		newWin.addEventListener('load', function() {
			newWin.removeEventListener('load', arguments.callee, false);

			newWin.MultipleTabService.duplicatingTabs = true;

			SS.setWindowState(newWin, aState, false);
			delete aState;

			newWin.gBrowser.mStrip.setAttribute('collapsed', true);


			// Step 4: Remove obsolete tabs

			newWin.setTimeout(function() {
				var restored = false;
				var tabs = Array.slice(newWin.gBrowser.mTabContainer.childNodes);
				var count = 0;
				for (var i = tabs.length-1; i > -1; i--)
				{
					if (SS.getTabValue(tabs[i], key)) count++;
				}

				// if this window is not initialized yet, continue after a while.
				if (count < aNumTabs) {
					newWin.setTimeout(arguments.callee, 10);
					return;
				}
				delete count;
				delete aNumTabs;

				for (var i = tabs.length-1; i > -1; i--)
				{
					if (SS.getTabValue(tabs[i], key)) continue;
					try {
						if (tabs[i].linkedBrowser.sessionHistory)
							tabs[i].linkedBrowser.sessionHistory.PurgeHistory(tabs[i].linkedBrowser.sessionHistory.count);
					}
					catch(e) {
						dump(e+'\n');
					}
					tabs[i].linkedBrowser.contentWindow.location.replace('about:blank');
					tabs[i].__multipletab__shouldRemove = true;
				}

				window.setTimeout(function() {
					for (var i = tabs.length-1; i > -1; i--)
					{
						try {
							SS.deleteTabValue(tabs[i], key);
						}
						catch(e) {
						}

						if (tabs[i].__multipletab__shouldRemove)
							newWin.gBrowser.removeTab(tabs[i]);
						else {
							tabs[i].removeAttribute('collapsed');
							newWin.MultipleTabService._duplicatedTabPostProcesses.forEach(function(aProcess) {
								aProcess(tabs[i], i);
							});
						}
					}

					newWin.gBrowser.mStrip.removeAttribute('collapsed');
					newWin.focus();

					newWin.MultipleTabService.duplicatingTabs = false;

					delete i;
					delete tabs;
					delete newWin;
					delete SS;
				}, 0);
			}, 0);

			delete tabs;
		}, false);

		return newWin;
	},
 
	registerClearTabValueKey : function(aKey) 
	{
		this._clearTabValueKeys.push(aKey);
	},
	_clearTabValueKeys : [],
 
	registerDuplicatedTabPostProcess : function(aProcess) 
	{
		this._duplicatedTabPostProcesses.push(aProcess);
	},
	_duplicatedTabPostProcesses : [],
  
	copyURIsToClipboard : function(aTabs, aFormat) 
	{
		if (!aTabs) return;

		var clipboard = Components.classes['@mozilla.org/widget/clipboardhelper;1']
								.getService(Components.interfaces.nsIClipboardHelper);
		var self = this;
		var stringToCopy = Array.slice(aTabs).map(function(aTab) {
				return self.formatURIStringForClipboard(aTab.linkedBrowser.currentURI.spec, aTab, aFormat);
			});
		if (stringToCopy.length > 1)
			stringToCopy.push('');
		clipboard.copyString(stringToCopy.join('\r\n'));
	},
	
	kFORMAT_TYPE_DEFAULT : 0, 
	kFORMAT_TYPE_MOZ_URL : 1,
	kFORMAT_TYPE_LINK    : 2,
 
	formatURIStringForClipboard : function(aURI, aTab, aFormat) 
	{
		var format = aFormat || this.getPref('extensions.multipletab.clipboard.formatType');
		switch (format)
		{
			default:
			case this.kFORMAT_TYPE_DEFAULT:
				return aURI;

			case this.kFORMAT_TYPE_MOZ_URL:
				return (aTab.linkedBrowser.contentDocument.title || aTab.getAttribute('label'))+
					'\r\n'+aURI;

			case this.kFORMAT_TYPE_LINK:
				return [
					'<a href="'+aURI.replace(/"/g, '&quot;')+'">',
					(aTab.linkedBrowser.contentDocument.title || aTab.getAttribute('label')),
					'</a>'
				].join('');
		}
	},
   
/* Move and Duplicate multiple tabs on Drag and Drop */ 
	
	getBundledTabsOf : function(aTab, aInfo) 
	{
		if (!aInfo) aInfo = {};
		aInfo.sourceWindow = null;
		aInfo.sourceBrowser = null;
		var tabs = [];

		var w, b;
		if (
			!aTab ||
			aTab.localName != 'tab' ||
			!(w = aTab.ownerDocument.defaultView) ||
			!('MultipleTabService' in w) ||
			!(b = w.MultipleTabService.getTabBrowserFromChild(aTab))
			)
			return tabs;

		aInfo.sourceWindow = w;
		aInfo.sourceBrowser = b;
		return w.MultipleTabService.getSelectedTabs(b);
	},
 
	calculateDeltaForNewPosition : function(aTabs, aOriginalPos, aNewPos) 
	{
		var isMove = aNewPos > -1;
		var movedToLeft = isMove && (aNewPos - aOriginalPos < 0);
		var afterTabsOffset = (!isMove || movedToLeft) ? 0 : -1 ;
		return aTabs.map(function(aTab) {
				var originalPos = aTab._tPos;
				if (aNewPos > -1) {
					if (
						movedToLeft &&
						aTab._tPos > aNewPos &&
						aTab._tPos <= aOriginalPos
						)
						originalPos--;
					else if (
						!movedToLeft &&
						aTab._tPos < aNewPos &&
						aTab._tPos >= aOriginalPos
						)
						originalPos++;
				}
				if (originalPos < aOriginalPos)
					return movedToLeft ? 0 : -1;
				return ++afterTabsOffset;
			});
	},
 
	moveBundledTabsOf : function(aMovedTab, aEvent) 
	{
		var b = this.getTabBrowserFromChild(aMovedTab);
		var tabs = this.getSelectedTabs(b);
		tabs.splice(tabs.indexOf(aMovedTab), 1);
		var delta = this.calculateDeltaForNewPosition(tabs, aEvent.detail, aMovedTab._tPos);
		b.movingSelectedTabs = true;
		tabs.forEach(function(aTab, aIndex) {
			b.moveTabTo(aTab, aMovedTab._tPos + delta[aIndex]);
		});
		b.movingSelectedTabs = false;
		b.mTabDropIndicatorBar.collapsed = true; // hide anyway!
	},
 
	windowMoveBundledTabsOf : function(aNewTab, aSourceTab) 
	{
		var targetBrowser = this.getTabBrowserFromChild(aNewTab);

		if (!targetBrowser.__multipletab__canDoWindowMove) {
			this.duplicateBundledTabsOf(aNewTab, aSourceTab, true);
			retrurn;
		}

		var info = {};
		var sourceTabs = this.getBundledTabsOf(aSourceTab, info);

		var index = sourceTabs.indexOf(aSourceTab);
		sourceTabs.splice(index, 1);

		var sourceBrowser = info.sourceBrowser;
		var sourceService = info.sourceWindow.MultipleTabService;
		var shouldClose = sourceBrowser.mTabContainer.childNodes.length == sourceTabs.length;

		var delta = sourceService.calculateDeltaForNewPosition(sourceTabs, aSourceTab._tPos, -1);

		targetBrowser.movingSelectedTabs = true;
		this.clearSelection(targetBrowser);

		var hasNextTab = aNewTab.nextSibling;
		sourceTabs.forEach(function(aTab, aIndex) {
			sourceService.setSelection(aTab, false);

			var newTab = targetBrowser.addTab();
			newTab.linkedBrowser.stop();
			newTab.linkedBrowser.docShell;
			targetBrowser.swapBrowsersAndCloseOther(newTab, aTab);
			targetBrowser.setTabTitle(newTab);

			if (delta[aIndex] > 0 && hasNextTab) delta[aIndex]--;
			targetBrowser.moveTabTo(newTab, aNewTab._tPos + delta[aIndex] + 1);

			this.setSelection(newTab, true);
		}, this);

		if (shouldClose) this.closeOwner(sourceBrowser);

		this.setSelection(aNewTab, true);
		targetBrowser.movingSelectedTabs = false;
	},
 
	closeOwner : function(aTabOwner) 
	{
		var w = aTabOwner.ownerDocument.defaultView;
		if (!w) return;
		if ('SplitBrowser' in w &&
			'getSubBrowserFromChild' in w.SplitBrowser) {
			var subbrowser = w.SplitBrowser.getSubBrowserFromChild(aTabOwner);
			if (subbrowser) {
				subbrowser.close();
				return;
			}
		}
		w.close();
	},
 
	duplicateBundledTabsOf : function(aNewTab, aSourceTab, aMayBeMove) 
	{
		var info = {};
		var sourceTabs = this.getBundledTabsOf(aSourceTab, info);

		var targetBrowser = this.getTabBrowserFromChild(aNewTab);
		var sourceBrowser = info.sourceBrowser;
		var sourceService = info.sourceWindow.MultipleTabService;

		var isMove = aMayBeMove && targetBrowser != sourceBrowser;
		var shouldClose = isMove && sourceBrowser.mTabContainer.childNodes.length == sourceTabs.length;

		var index = sourceTabs.indexOf(aSourceTab);
		sourceTabs.splice(index, 1);

		var delta = sourceService.calculateDeltaForNewPosition(sourceTabs, aSourceTab._tPos, -1);

		sourceService.setSelection(aSourceTab, false);
		var self = this;
		window.setTimeout(function() {
			targetBrowser.duplicatingSelectedTabs = true;
			targetBrowser.movingSelectedTabs = true;

			var hasNextTab = aNewTab.nextSibling;

			sourceTabs.forEach(function(aTab, aIndex) {
				sourceService.setSelection(aTab, false);

				var newTab = targetBrowser.duplicateTab(aTab);

				if (delta[aIndex] > 0 && hasNextTab) delta[aIndex]--;
				targetBrowser.moveTabTo(newTab, aNewTab._tPos + delta[aIndex] + 1);

				if (isMove) sourceBrowser.removeTab(aTab);

				self.setSelection(newTab, true);
			});

			if (shouldClose) self.closeOwner(sourceBrowser);

			self.setSelection(aNewTab, true);
			targetBrowser.movingSelectedTabs = false;
			targetBrowser.duplicatingSelectedTabs = false;
			targetBrowser.mTabDropIndicatorBar.collapsed = true; // hide anyway!

			delete info.sourceBrowser;
			delete info.sourceWindow;
			info = null;
		}, 0);
	},
 
	tearOffSelectedTabsFromRemote : function() 
	{
		var remoteTab = window.arguments[0];
		var info = {};
		var tabs = this.getBundledTabsOf(remoteTab, info);
		if (tabs.length) {
			if (this.isDraggingAllTabs(remoteTab)) {
				window.close();
			}
			else {
				window.setTimeout(function() {
					info.sourceWindow.MultipleTabService.splitWindowFromTabs(tabs, window);
				}, 0);
			}
			return true;
		}
		return false;
	},
	
	isDraggingAllTabs : function(aTab) 
	{
		var info = {};
		var tabs = this.getBundledTabsOf(aTab, info);
		return tabs.length && tabs.length == info.sourceBrowser.mTabContainer.childNodes.length;
	},
   
/* Tab Selection */ 
	
	hasSelection : function(aTabBrowser) 
	{
		try {
			var xpathResult = document.evaluate(
					'descendant::xul:tab[@'+this.kSELECTED+' = "true"]',
					(aTabBrowser || this.browser).mTabContainer,
					this.NSResolver, // document.createNSResolver(document.documentElement),
					XPathResult.FIRST_ORDERED_NODE_TYPE,
					null
				);
			return xpathResult.singleNodeValue ? true : false ;
		}
		catch(e) {
		}
		return false;
	},
 
	isSelected : function(aTab) 
	{
		return aTab.getAttribute(this.kSELECTED) == 'true';
	},
 
	setSelection : function(aTab, aState) 
	{
		return this.setBooleanAttributeToTab(aTab, this.kSELECTED, aState, true);
	},
	
	setReadyToClose : function(aTab, aState) 
	{
		return this.setBooleanAttributeToTab(aTab, this.kREADY_TO_CLOSE, aState, false);
	},
 
	setBooleanAttributeToTab : function(aTab, aAttr, aState, aShouldSaveToSession) 
	{
		if (!aState) {
			aTab.removeAttribute(aAttr);
			if (aShouldSaveToSession) {
				try {
					this.SessionStore.deleteTabValue(aTab, this.kSELECTED);
				}
				catch(e) {
				}
			}
		}
		else {
			aTab.setAttribute(aAttr, true);
			if (aShouldSaveToSession) {
				try {
					this.SessionStore.setTabValue(aTab, this.kSELECTED, 'true');
				}
				catch(e) {
				}
			}
		}
		this.selectionModified = true;

		if ('TreeStyleTabService' in window &&
			'getDescendantTabs' in TreeStyleTabService &&
			aTab.getAttribute(TreeStyleTabService.kSUBTREE_COLLAPSED) == 'true') {
			var tabs = TreeStyleTabService.getDescendantTabs(aTab);
			for (var i = 0, maxi = tabs.length; i < maxi; i++)
			{
				this.setBooleanAttributeToTab(tabs[i], aAttr, aState, aShouldSaveToSession);
			}
		}

		return aState;
	},
  
	toggleSelection : function(aTab) 
	{
		return this.toggleBooleanAttributeToTab(aTab, this.kSELECTED, true);
	},
	
	toggleReadyToClose : function(aTab) 
	{
		return this.toggleBooleanAttributeToTab(aTab, this.kREADY_TO_CLOSE, false);
	},
 
	toggleBooleanAttributeToTab : function(aTab, aAttr, aShouldSaveToSession) 
	{
		return this.setBooleanAttributeToTab(aTab, aAttr, aTab.getAttribute(aAttr) != 'true', aShouldSaveToSession);
	},

  
	clearSelection : function(aTabBrowser) 
	{
		this.clearSelectionSub(this.getSelectedTabs(aTabBrowser), this.kSELECTED);
		this.clearSelectionSub(this.getReadyToCloseTabs(aTabBrowser), this.kREADY_TO_CLOSE);
		this.selectionModified = false;
	},
	clearSelectionSub : function(aTabs, aAttr)
	{
		if (!aTabs || !aTabs.length) return;

		for (var i = aTabs.length-1; i > -1; i--)
		{
			aTabs[i].removeAttribute(aAttr);
			try {
				this.SessionStore.deleteTabValue(aTabs[i], aAttr);
			}
			catch(e) {
			}
		}
	},
	selectionModified : false,
  
/* Pref Listener */ 
	
	domain : 'extensions.multipletab', 
 
	observe : function(aSubject, aTopic, aPrefName) 
	{
		if (aTopic != 'nsPref:changed') return;

		var value = this.getPref(aPrefName);
		switch (aPrefName)
		{
			case 'extensions.multipletab.tabdrag.mode':
				this.tabDragMode = value;
				break;

			case 'extensions.multipletab.tabclick.mode':
				this.tabClickMode = value;
				break;

			case 'extensions.multipletab.selectionStyle':
				if (value == 'auto') {
					value = ('tabColors' in window || 'CHROMATABS' in window) ? 'border' :
							'color' ;
				}
				document.documentElement.setAttribute(this.kSELECTION_STYLE, value);
				break;

			default:
				break;
		}
	},
  
/* Save/Load Prefs */ 
	
	get Prefs() 
	{
		if (!this._Prefs) {
			this._Prefs = Components.classes['@mozilla.org/preferences;1'].getService(Components.interfaces.nsIPrefBranch);
		}
		return this._Prefs;
	},
	_Prefs : null,
 
	getPref : function(aPrefstring, aInterface) 
	{
		try {
			if (aInterface) {
				return this.Prefs.getComplexValue(aPrefstring, aInterface);
			}

			switch (this.Prefs.getPrefType(aPrefstring))
			{
				case this.Prefs.PREF_STRING:
					return decodeURIComponent(escape(this.Prefs.getCharPref(aPrefstring)));
					break;
				case this.Prefs.PREF_INT:
					return this.Prefs.getIntPref(aPrefstring);
					break;
				default:
					return this.Prefs.getBoolPref(aPrefstring);
					break;
			}
		}
		catch(e) {
		}

		return null;
	},
 
	setPref : function(aPrefstring, aNewValue) 
	{
		var pref = this.Prefs ;
		var type;
		try {
			type = typeof aNewValue;
		}
		catch(e) {
			type = null;
		}

		switch (type)
		{
			case 'string':
				pref.setCharPref(aPrefstring, unescape(encodeURIComponent(aNewValue)));
				break;
			case 'number':
				pref.setIntPref(aPrefstring, parseInt(aNewValue));
				break;
			default:
				pref.setBoolPref(aPrefstring, aNewValue);
				break;
		}
		return true;
	},
 
	clearPref : function(aPrefstring) 
	{
		try {
			this.Prefs.clearUserPref(aPrefstring);
		}
		catch(e) {
		}

		return;
	},
 
	addPrefListener : function(aObserver) 
	{
		var domains = ('domains' in aObserver) ? aObserver.domains : [aObserver.domain] ;
		try {
			var pbi = this.Prefs.QueryInterface(Components.interfaces.nsIPrefBranchInternal);
			for (var i = 0; i < domains.length; i++)
				pbi.addObserver(domains[i], aObserver, false);
		}
		catch(e) {
		}
	},
 
	removePrefListener : function(aObserver) 
	{
		var domains = ('domains' in aObserver) ? aObserver.domains : [aObserver.domain] ;
		try {
			var pbi = this.Prefs.QueryInterface(Components.interfaces.nsIPrefBranchInternal);
			for (var i = 0; i < domains.length; i++)
				pbi.removeObserver(domains[i], aObserver, false);
		}
		catch(e) {
		}
	}
   
}; 

window.addEventListener('load', MultipleTabService, false);
window.addEventListener('DOMContentLoaded', MultipleTabService, false);
 
