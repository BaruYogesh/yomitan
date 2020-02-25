/*
 * Copyright (C) 2016-2020  Alex Yatskov <alex@foosoft.net>
 * Author: Alex Yatskov <alex@foosoft.net>
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

/*global popupNestedInitialize, apiForward, apiGetMessageToken, Display*/

class DisplayFloat extends Display {
    constructor() {
        super(document.querySelector('#spinner'), document.querySelector('#definitions'));
        this.autoPlayAudioTimer = null;

        this.optionsContext = {
            depth: 0,
            url: window.location.href
        };

        this._orphaned = false;
        this._prepareInvoked = false;
        this._messageToken = null;
        this._messageTokenPromise = null;

        yomichan.on('orphaned', () => this.onOrphaned());
        window.addEventListener('message', (e) => this.onMessage(e), false);
    }

    async prepare(options, popupInfo, url, childrenSupported, scale, uniqueId) {
        if (this._prepareInvoked) { return; }
        this._prepareInvoked = true;

        await super.prepare(options);

        const {id, depth, parentFrameId} = popupInfo;
        this.optionsContext.depth = depth;
        this.optionsContext.url = url;

        if (childrenSupported) {
            popupNestedInitialize(id, depth, parentFrameId, url);
        }

        this.setContentScale(scale);

        apiForward('popupPrepareCompleted', {uniqueId});
    }

    onError(error) {
        if (this._orphaned) {
            this.setContent('orphaned');
        } else {
            logError(error, true);
        }
    }

    onOrphaned() {
        this._orphaned = true;
    }

    onSearchClear() {
        window.parent.postMessage('popupClose', '*');
    }

    onSelectionCopy() {
        window.parent.postMessage('selectionCopy', '*');
    }

    onMessage(e) {
        const data = e.data;
        if (typeof data !== 'object' || data === null) { return; } // Invalid data

        const token = data.token;
        if (typeof token !== 'string') { return; } // Invalid data

        if (this._messageToken === null) {
            // Async
            this.getMessageToken()
                .then(
                    () => { this.handleAction(token, data); },
                    () => {}
                );
        } else {
            // Sync
            this.handleAction(token, data);
        }
    }

    onKeyDown(e) {
        const key = Display.getKeyFromEvent(e);
        const handler = DisplayFloat._onKeyDownHandlers.get(key);
        if (typeof handler === 'function') {
            if (handler(this, e)) {
                e.preventDefault();
                return true;
            }
        }
        return super.onKeyDown(e);
    }

    async getMessageToken() {
        // this._messageTokenPromise is used to ensure that only one call to apiGetMessageToken is made.
        if (this._messageTokenPromise === null) {
            this._messageTokenPromise = apiGetMessageToken();
        }
        const messageToken = await this._messageTokenPromise;
        if (this._messageToken === null) {
            this._messageToken = messageToken;
        }
        this._messageTokenPromise = null;
    }

    handleAction(token, {action, params}) {
        if (token !== this._messageToken) {
            // Invalid token
            return;
        }

        const handler = DisplayFloat._messageHandlers.get(action);
        if (typeof handler !== 'function') { return; }

        handler(this, params);
    }

    getOptionsContext() {
        return this.optionsContext;
    }

    autoPlayAudio() {
        this.clearAutoPlayTimer();
        this.autoPlayAudioTimer = window.setTimeout(() => super.autoPlayAudio(), 400);
    }

    clearAutoPlayTimer() {
        if (this.autoPlayAudioTimer) {
            window.clearTimeout(this.autoPlayAudioTimer);
            this.autoPlayAudioTimer = null;
        }
    }

    setContentScale(scale) {
        document.body.style.fontSize = `${scale}em`;
    }
}

DisplayFloat._onKeyDownHandlers = new Map([
    ['C', (self, e) => {
        if (e.ctrlKey && !window.getSelection().toString()) {
            self.onSelectionCopy();
            return true;
        }
        return false;
    }]
]);

DisplayFloat._messageHandlers = new Map([
    ['setContent', (self, {type, details}) => self.setContent(type, details)],
    ['clearAutoPlayTimer', (self) => self.clearAutoPlayTimer()],
    ['setCustomCss', (self, {css}) => self.setCustomCss(css)],
    ['prepare', (self, {options, popupInfo, url, childrenSupported, scale, uniqueId}) => self.prepare(options, popupInfo, url, childrenSupported, scale, uniqueId)],
    ['setContentScale', (self, {scale}) => self.setContentScale(scale)]
]);

DisplayFloat.instance = new DisplayFloat();
