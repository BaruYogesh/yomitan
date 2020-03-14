/*
 * Copyright (C) 2019-2020  Alex Yatskov <alex@foosoft.net>
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

class TextToSpeechAudio {
    constructor(text, voice) {
        this.text = text;
        this.voice = voice;
        this._utterance = null;
        this._volume = 1;
    }

    get currentTime() {
        return 0;
    }
    set currentTime(value) {
        // NOP
    }

    get volume() {
        return this._volume;
    }
    set volume(value) {
        this._volume = value;
        if (this._utterance !== null) {
            this._utterance.volume = value;
        }
    }

    play() {
        try {
            if (this._utterance === null) {
                this._utterance = new SpeechSynthesisUtterance(this.text || '');
                this._utterance.lang = 'ja-JP';
                this._utterance.volume = this._volume;
                this._utterance.voice = this.voice;
            }

            speechSynthesis.cancel();
            speechSynthesis.speak(this._utterance);
        } catch (e) {
            // NOP
        }
    }

    pause() {
        try {
            speechSynthesis.cancel();
        } catch (e) {
            // NOP
        }
    }
}

class AudioSystem {
    constructor({getAudioUri}) {
        this._cache = new Map();
        this._cacheSizeMaximum = 32;
        this._getAudioUri = getAudioUri;

        if (typeof speechSynthesis !== 'undefined') {
            // speechSynthesis.getVoices() will not be populated unless some API call is made.
            speechSynthesis.addEventListener('voiceschanged', this._onVoicesChanged.bind(this));
        }
    }

    async getDefinitionAudio(definition, sources, details) {
        const key = `${definition.expression}:${definition.reading}`;
        const cacheValue = this._cache.get(definition);
        if (typeof cacheValue !== 'undefined') {
            const {audio, uri, source} = cacheValue;
            return {audio, uri, source};
        }

        for (const source of sources) {
            const uri = await this._getAudioUri(definition, source, details);
            if (uri === null) { continue; }

            try {
                const audio = await this._createAudio(uri, details);
                this._cacheCheck();
                this._cache.set(key, {audio, uri, source});
                return {audio, uri, source};
            } catch (e) {
                // NOP
            }
        }

        throw new Error('Could not create audio');
    }

    createTextToSpeechAudio({text, voiceUri}) {
        const voice = this._getTextToSpeechVoiceFromVoiceUri(voiceUri);
        if (voice === null) {
            throw new Error('Invalid text-to-speech voice');
        }
        return new TextToSpeechAudio(text, voice);
    }

    _onVoicesChanged() {
        // NOP
    }

    async _createAudio(uri, details) {
        const ttsParameters = this._getTextToSpeechParameters(uri);
        if (ttsParameters !== null) {
            if (typeof details === 'object' && details !== null) {
                if (details.tts === false) {
                    throw new Error('Text-to-speech not permitted');
                }
            }
            return this.createTextToSpeechAudio(ttsParameters);
        }

        return await this._createAudioFromUrl(uri);
    }

    _createAudioFromUrl(url) {
        return new Promise((resolve, reject) => {
            const audio = new Audio(url);
            audio.addEventListener('loadeddata', () => {
                const duration = audio.duration;
                if (duration === 5.694694 || duration === 5.720718) {
                    // Hardcoded values for invalid audio
                    reject(new Error('Could not retrieve audio'));
                } else {
                    resolve(audio);
                }
            });
            audio.addEventListener('error', () => reject(audio.error));
        });
    }

    _getTextToSpeechVoiceFromVoiceUri(voiceUri) {
        try {
            for (const voice of speechSynthesis.getVoices()) {
                if (voice.voiceURI === voiceUri) {
                    return voice;
                }
            }
        } catch (e) {
            // NOP
        }
        return null;
    }

    _getTextToSpeechParameters(uri) {
        const m = /^tts:[^#?]*\?([^#]*)/.exec(uri);
        if (m === null) { return null; }

        const searchParameters = new URLSearchParams(m[1]);
        const text = searchParameters.get('text');
        const voiceUri = searchParameters.get('voice');
        return (text !== null && voiceUri !== null ? {text, voiceUri} : null);
    }

    _cacheCheck() {
        const removeCount = this._cache.size - this._cacheSizeMaximum;
        if (removeCount <= 0) { return; }

        const removeKeys = [];
        for (const key of this._cache.keys()) {
            removeKeys.push(key);
            if (removeKeys.length >= removeCount) { break; }
        }

        for (const key of removeKeys) {
            this._cache.delete(key);
        }
    }
}
