import "../styles/shared.js";
import "./cloud-view.js";
import "./icon.js";
import "./list-view.js";
import "./record-view.js";
import "./settings-view.js";
import "./start-view.js";
import "./title-bar.js";
import { Input } from "./input.js";
import { getPlatformName, getDeviceInfo, isTouch } from "@padlock/core/lib/platform.js";
import { applyMixins } from "@padlock/core/lib/util.js";
import { localize as $l } from "@padlock/core/lib/locale.js";
import { BaseElement, html } from "./base.js";
import {
    NotificationMixin,
    DialogMixin,
    MessagesMixin,
    DataMixin,
    AnimationMixin,
    ClipboardMixin,
    SyncMixin,
    AutoLockMixin,
    HintsMixin,
    LocaleMixin
} from "../mixins";

/* global cordova, StatusBar */

const cordovaReady = new Promise(resolve => {
    document.addEventListener("deviceready", resolve);
});

class App extends applyMixins(
    BaseElement,
    DataMixin,
    SyncMixin,
    AutoLockMixin,
    DialogMixin,
    MessagesMixin,
    NotificationMixin,
    HintsMixin,
    AnimationMixin,
    ClipboardMixin,
    LocaleMixin
) {
    static get template() {
        return html`
        <style include="shared">

            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }

            @keyframes viewIn {
                from { transform: translate3d(100%, 0, 0) rotateY(-30deg); z-index: 1; }
                to { transform: translate3d(0, 0, 0); z-index: 1; }
            }

            @keyframes viewOutBack {
                from { transform: translate3d(0, 0, 0); }
                to { transform: translate3d(0, 0, -200px) rotateX(10deg); }
            }

            @keyframes viewOutSide {
                from { transform: translate3d(0, 0, 0); }
                to { transform: translate3d(100%, 0, 0) rotateY(-30deg); }
            }

            @keyframes menuItemIn {
                to { transform: translate3d(0, 0, 0); }
            }

            @keyframes menuItemOut {
                from { transform: translate3d(0, 0, 0); }
            }

            @keyframes tagIn {
                from { transform: translate3d(0, 100px, 0); opacity: 0; }
            }

            :host {
                --color-gutter: #222;
                --title-bar-height: 30px;
                --menu-width: 200px;
                --menu-icon-width: 40px;
                --main-padding: 0px;
                overflow: hidden;
                color: var(--color-foreground);
                background: var(--color-gutter);
                position: absolute;
                width: 100%;
                height: 100%;
                animation: fadeIn 0.5s backwards 0.2s;
                perspective: 1000px;
            }

            :host(:not(.ios):not(.android)) {
                --main-padding: var(--gutter-width);
            }

            :host(.windows) {
                --title-bar-height: 40px;
            }

            :host(.ios), :host(.android) {
                --color-gutter: black;
            }

            #main {
                @apply --fullbleed;
                display: flex;
                overflow: hidden;
                perspective: 1000px;
                top: var(--main-padding);
                left: calc(var(--main-padding) + var(--menu-icon-width));
                right: var(--main-padding);
                bottom: var(--main-padding);
            }

            :host(.macos) #main, :host(.windows) #main, :host(.linux) #main {
                top: var(--title-bar-height) !important;
            }

            :host(.ios) #main {
                top: constant(safe-area-inset-top);
                top: env(safe-area-inset-top);
            }

            #main, #listView {
                transform: translate3d(0, 0, 0);
                transform-origin: 0 center;
                transition: transform 0.4s cubic-bezier(0.6, 0, 0.2, 1);
            }

            #main:not(.active),
            :host(.dialog-open) #main {
                transform: translate3d(0, 0, -150px) rotateX(5deg);
            }

            #main.show-menu {
                transform: translate3d(calc(var(--menu-width) - var(--menu-icon-width)), 0, 0) rotateY(-5deg);
            }

            :host(:not(.macos):not(.windows):not(.linux)) pl-title-bar {
                display: none;
            }

            #listView {
                flex: 1;
                overflow: hidden;
            }

            #pages {
                position: relative;
                flex: 1.62; /* Golden Ratio ;) */
                margin-left: var(--gutter-width);
                pointer-events: none;
                perspective: 1000px;
            }

            .view {
                transform: translate3d(0, 0, 0);
                overflow: hidden;
            }

            .view.showing {
                pointer-events: auto;
            }

            .view:not(.showing) {
                opacity: 0;
            }

            #placeholderView {
                @apply --fullbleed;
                display: flex;
                align-items: center;
                justify-content: center;
                text-align: center;
            }

            .placeholder-icon {
                display: block;
                font-size: 120px;
                width: 150px;
                color: var(--color-foreground);
                opacity: 0.5;
            }

            .menu, .tags {
                position: absolute;
                top: var(--title-bar-height);
                left: var(--main-padding);
                bottom: 0;
                z-index: -2;
                display: flex;
                flex-direction: column;
                width: var(--menu-width);
                box-sizing: border-box;
                color: var(--color-background);
                transition: opacity 0.3s;
            }

            .tags {
                @apply --scroll;
            }

            .menu-item {
                display: flex;
                align-items: center;
                height: 45px;
                justify-content: flex-end;
                position: relative;
                text-align: right;
                flex: none;
            }

            .menu-item > div {
                @apply --ellipsis;
            }

            .menu .menu-item {
                transform: translate3d(calc(var(--menu-icon-width) - var(--menu-width)), 0, 0);
            }

            .menu-item.tag {
                font-size: var(--font-size-small);
                height: 35px;
            }

            .menu-item.tag pl-icon {
                font-size: 90%;
                height: 35px;
                width: 35px;
                margin-right: 5px;
            }

            .menu-item:hover {
                background: rgba(255, 255, 255, 0.1);
            }

            .menu-item > pl-icon {
                width: 45px;
                height: 45px;
                font-size: 120%;
            }

            .menu-item-hint {
                font-size: 12px;
            }

            .last-sync {
                opacity: 0.6;
            }

            .last-sync::before {
                font-family: "FontAwesome";
                font-size: 90%;
                content: "\\f017\\ ";
            }

            .menu-wrapper {
                @apply --fullbleed;
                z-index: -1;
            }

            .menu-wrapper.show-menu {
                z-index: 10;
            }

            .menu-item-hint.warning {
                color: var(--color-error);
            }

            .menu-item-hint.warning::before {
                font-family: "FontAwesome";
                font-size: 85%;
                content: "\\f071\\ ";
                position: relative;
                top: -1px;
            }

            .menu-info {
                font-size: var(--font-size-tiny);
                text-align: center;
                padding: 20px;
                color: rgba(255, 255, 255, 0.5);
                transition: opacity 400ms;
            }

            .menu-wrapper:not(.show-menu) .menu-info {
                opacity: 0;
            }

            [show-tags] .menu, :not([show-tags]) .tags {
                opacity: 0;
                pointer-events: none;
            }

            .no-tags {
                padding: 0 15px;
                font-size: var(--font-size-small);
                text-align: right;
                width: 130px;
                align-self: flex-end;
            }

            @media (max-width: 900px) {
                #pages {
                    flex: 1;
                }
            }

            @media (max-width: 700px) {
                :host {
                    --menu-icon-width: 0px;
                }

                .showing-pages #listView {
                    transform: translate3d(0, 0, -150px) rotateX(10deg);
                }

                #pages {
                    @apply --fullbleed;
                    box-shadow: none;
                    z-index: 1;
                    margin-left: 0;
                    overflow: visible;
                }

                #placeholderView {
                    display: none;
                }
            }
        </style>

        <pl-start-view id="startView"></pl-start-view>

        <div id="menuWrapper" class="menu-wrapper" on-click="_menuWrapperClicked" show-tags\$="[[ _showingTags ]]">
            <div id="menu" class="menu">
                <div class="spacer"></div>
                <div class="account menu-item tap" on-click="_openCloudView">
                    <div>
                        <div hidden\$="[[ settings.syncConnected ]]">[[ \$l("Log In") ]]</div>
                        <div hidden\$="[[ !settings.syncConnected ]]">[[ \$l("My Account") ]]</div>
                        <div class="menu-item-hint warning" hidden\$="[[ !isTrialExpired(settings.syncConnected, settings.syncSubStatus) ]]">[[ \$l("Trial Expired") ]]</div>
                        <div class="menu-item-hint warning" hidden\$="[[ !isSubUnpaid(settings.syncConnected, settings.syncSubStatus) ]]">[[ \$l("Payment Failed") ]]</div>
                        <div class="menu-item-hint warning" hidden\$="[[ !isSubCanceled(settings.syncConnected, settings.syncSubStatus) ]]">[[ \$l("Subscr. Canceled") ]]</div>
                    </div>
                    <pl-icon icon="cloud" class="account-icon"></pl-icon>
                </div>
                <div class="menu-item tap" on-click="synchronize" disabled\$="[[ !isSubValid(settings.syncConnected, settings.syncSubStatus) ]]">
                    <div>
                        <div>[[ \$l("Synchronize") ]]</div>
                        <div class="menu-item-hint" hidden\$="[[ settings.syncConnected ]]">[[ \$l("Log In To Sync") ]]</div>
                        <div class="menu-item-hint last-sync" hidden\$="[[ !settings.syncConnected ]]">[[ lastSync ]]</div>
                    </div>
                    <pl-icon icon="refresh" spin\$="[[ isSynching ]]"></pl-icon>
                </div>
                <!-- <div class="menu&#45;item tap" on&#45;click="_newRecord"> -->
                <!--     <div>[[ \$l("Add Record") ]]</div> -->
                <!--     <pl&#45;icon icon="add"></pl&#45;icon> -->
                <!-- </div> -->
                <div class="menu-item tap" on-click="_openSettings">
                    <div>[[ \$l("Settings") ]]</div>
                    <pl-icon icon="settings"></pl-icon>
                </div>
                <div class="menu-item tap" on-click="_showTags">
                    <div>[[ \$l("Tags") ]]</div>
                    <pl-icon icon="tag"></pl-icon>
                </div>
                <div class="menu-item tap" on-click="_enableMultiSelect">
                    <div>[[ \$l("Multi-Select") ]]</div>
                    <pl-icon icon="checked"></pl-icon>
                </div>
                <div class="menu-item tap" on-click="_lock">
                    <div>[[ \$l("Lock App") ]]</div>
                    <pl-icon icon="lock"></pl-icon>
                </div>
                <div class="spacer"></div>
                <div class="menu-info">
                    <div><strong>Padlock {{ settings.version }}</strong></div>
                    <div>Made with ♥ in Germany</div>
                </div>
            </div>

            <div class="tags">
                <div class="spacer"></div>
                <div class="menu-item tap" on-click="_closeTags">
                    <div>[[ \$l("Tags") ]]</div>
                    <pl-icon icon="close"></pl-icon>
                </div>
                <template is="dom-repeat" items="[[ state.currentStore.tags ]]">
                    <div class="menu-item tag tap" on-click="_selectTag">
                        <div>[[ item ]]</div>
                        <pl-icon icon="tag"></pl-icon>
                    </div>
                </template>
                <div class="no-tags" disabled="" hidden\$="[[ _hasTags(state.currentStore.tags) ]]">
                    [[ \$l("You don't have any tags yet!") ]]
                </div>
                <div class="spacer"></div>
            </div>
        </div>

        <div id="main">

            <pl-list-view id="listView" on-open-settings="_openSettings" on-open-cloud-view="_openCloudView" on-toggle-menu="_toggleMenu"></pl-list-view>

            <div id="pages">

                <div id="placeholderView">
                    <pl-icon icon="logo" class="placeholder-icon"></pl-icon>
                </div>

                <pl-record-view id="recordView" class="view" on-record-close="_closeRecord"></pl-record-view>

                <pl-settings-view id="settingsView" class="view" on-settings-back="_settingsBack"></pl-settings-view>

                <pl-cloud-view id="cloudView" class="view" on-cloud-back="_cloudViewBack"></pl-cloud-view>

            </div>

        </div>

        <pl-title-bar></pl-title-bar>
`;
    }

    static get is() {
        return "pl-app";
    }

    static get properties() {
        return {
            _currentView: {
                type: String,
                value: "",
                observer: "_currentViewChanged"
            },
            _menuOpen: {
                type: Boolean,
                value: false,
                observer: "_menuOpenChanged"
            },
            _showingTags: {
                type: Boolean,
                value: false
            }
        };
    }

    static get observers() {
        return ["_lockedChanged(state.locked)", "_currentRecordChanged(state.currentRecord)"];
    }

    constructor() {
        super();

        // If we want to capture all keydown events, we have to add the listener
        // directly to the document
        document.addEventListener("keydown", this._keydown.bind(this), false);

        // Listen for android back button
        document.addEventListener("backbutton", this._back.bind(this), false);

        document.addEventListener("dialog-open", () => this.classList.add("dialog-open"));
        document.addEventListener("dialog-close", () => this.classList.remove("dialog-open"));
    }

    get _isNarrow() {
        return this.offsetWidth < 600;
    }

    connectedCallback() {
        super.connectedCallback();
        let isIPhoneX;
        getDeviceInfo()
            .then(device => {
                isIPhoneX = /iPhone10,3|iPhone10,6/.test(device.model);
                if (isIPhoneX) {
                    Object.assign(document.body.style, {
                        margin: 0,
                        height: "812px",
                        position: "relative"
                    });
                }
                return cordovaReady;
            })
            .then(() => {
                // Replace window.open method with the inappbrowser equivalent
                window.open = cordova.InAppBrowser.open;
                if (isIPhoneX) {
                    StatusBar && StatusBar.show();
                }
                navigator.splashscreen.hide();
            });

        getPlatformName().then(platform => {
            const className = platform.toLowerCase().replace(/ /g, "-");
            if (className) {
                this.classList.add(className);
                this.root.querySelector("pl-title-bar").classList.add(className);
            }
        });

        if (!isTouch()) {
            window.addEventListener("focus", () =>
                setTimeout(() => {
                    if (this.locked) {
                        this.$.startView.focus();
                    }
                }, 100)
            );
        }
    }

    _closeRecord() {
        this.app.selectRecord(null);
    }

    _currentRecordChanged() {
        clearTimeout(this._selectedRecordChangedTimeout);
        this._selectedRecordChangedTimeout = setTimeout(() => {
            if (this.state.currentRecord) {
                this.$.recordView.record = this.state.currentRecord;
                this._currentView = "recordView";
            } else if (this._currentView == "recordView") {
                this._currentView = "";
            }
        }, 10);
    }

    _openSettings() {
        this._currentView = "settingsView";
        this.app.selectRecord(null);
    }

    _settingsBack() {
        this._currentView = "";
    }

    _openCloudView() {
        this._currentView = "cloudView";
        this.refreshAccount();
        this.app.selectRecord(null);
        if (!this.settings.syncConnected && !isTouch()) {
            setTimeout(() => this.$.cloudView.focusEmailInput(), 500);
        }
    }

    _cloudViewBack() {
        this._currentView = "";
    }

    _currentViewChanged(curr, prev) {
        this.$.main.classList.toggle("showing-pages", !!curr);

        const currView = this.$[curr];
        const prevView = this.$[prev];
        if (currView) {
            this.animateElement(currView, {
                animation: "viewIn",
                duration: 400,
                easing: "cubic-bezier(0.6, 0, 0.2, 1)",
                fill: "backwards"
            });
            currView.classList.add("showing");
            currView.animate();
        }
        if (prevView) {
            this.animateElement(prevView, {
                animation: !curr || this._isNarrow ? "viewOutSide" : "viewOutBack",
                duration: 400,
                easing: "cubic-bezier(0.6, 0, 0.2, 1)",
                fill: "forwards"
            });
            setTimeout(() => prevView.classList.remove("showing"), 350);
        }
    }

    //* Keyboard shortcuts
    _keydown(event) {
        if (this.locked || Input.activeInput) {
            return;
        }

        let shortcut;
        const control = event.ctrlKey || event.metaKey;

        // ESCAPE -> Back
        if (event.key === "Escape") {
            shortcut = () => this._back();
        }
        // CTRL/CMD + F -> Filter
        else if (control && event.key === "f") {
            shortcut = () => this.$.listView.search();
        }
        // CTRL/CMD + N -> New Record
        else if (control && event.key === "n") {
            shortcut = () => this._newRecord();
        }

        // If one of the shortcuts matches, execute it and prevent the default behaviour
        if (shortcut) {
            shortcut();
            event.preventDefault();
        } else if (event.key.length === 1) {
            this.$.listView.search();
        }
    }

    _back() {
        switch (this._currentView) {
            case "recordView":
                this._closeRecord();
                break;
            case "settingsView":
                this._settingsBack();
                break;
            case "cloudView":
                this._cloudViewBack();
                break;
            default:
                if (this.$.listView.filterActive) {
                    this.$.listView.clearFilter();
                } else {
                    navigator.Backbutton && navigator.Backbutton.goBack();
                }
        }
    }

    _lockedChanged() {
        if (this.state.locked) {
            this._currentView = "";
            this.$.main.classList.remove("active");
            this._menuOpen = false;
            this.clearDialogs();
            this.clearClipboard();
        } else {
            setTimeout(() => {
                this.$.main.classList.add("active");
            }, 600);
        }
    }

    _menuOpenChanged() {
        this.$.menuWrapper.classList.toggle("show-menu", this._menuOpen);
        this.$.main.classList.toggle("show-menu", this._menuOpen);
        if (!this._menuOpen) {
            setTimeout(() => (this._showingTags = false), 300);
        }
        this.animateCascade(this.root.querySelectorAll(".menu .menu-item"), {
            animation: this._menuOpen ? "menuItemIn" : "menuItemOut",
            duration: 400,
            fullDuration: 600,
            initialDelay: 50,
            fill: "both"
        });
    }

    _toggleMenu() {
        this._menuOpen = !this._menuOpen;
    }

    _lock() {
        if (this.isSynching) {
            this.alert($l("Cannot lock app while sync is in progress!"));
        } else {
            this.app.lock();
        }
    }

    _newRecord() {
        const record = this.app.createRecord();
        this.app.selectRecord(record);
    }

    _enableMultiSelect() {
        this.$.listView.multiSelect = true;
    }

    _menuWrapperClicked() {
        setTimeout(() => (this._menuOpen = false), 50);
    }

    _showTags(e) {
        this._menuOpen = true;
        this._showingTags = true;
        this.animateCascade(this.root.querySelectorAll(".tags .menu-item, .no-tags"), {
            animation: "tagIn",
            duration: 400,
            fullDuration: 600,
            fill: "both"
        });
        e.stopPropagation();
    }

    _closeTags(e) {
        this._showingTags = false;
        e.stopPropagation();
    }

    _selectTag(e) {
        setTimeout(() => {
            this.$.listView.filterString = e.model.item;
        }, 350);
    }

    _hasTags() {
        return !!this.state.currentStore && !!this.state.currentStore.tags.length;
    }
}

window.customElements.define(App.is, App);