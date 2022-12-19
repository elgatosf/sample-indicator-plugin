/// <reference path="libs/js/stream-deck.js" />
/// <reference path="libs/js/action.js" />
/// <reference path="libs/js/utils.js" />

// Action Cache
const MACTIONS = {};
const cycle = (idx, min, max) => (idx > max ? min : idx < min ? max : idx);

// Action Events
const sampleIndicatorAction = new Action('com.elgato.sample-indicator.action');

sampleIndicatorAction.onWillAppear(({context, payload}) => {
    // console.log('will appear', context, payload);
    MACTIONS[context] = new SampleIndicatorAction(context, payload);
});

sampleIndicatorAction.onWillDisappear(({context}) => {
    // console.log('will disappear', context);
    MACTIONS[context].interval && clearInterval(MACTIONS[context].interval);
    delete MACTIONS[context];
});

sampleIndicatorAction.onTitleParametersDidChange(({context, payload}) => {
    // console.log('wonTitleParametersDidChange', context, payload);
    MACTIONS[context].color = payload.titleParameters.titleColor;
});

sampleIndicatorAction.onKeyUp(({context, payload}) => {
    // console.log('onKeyUp', context, payload);
    MACTIONS[context].toggle();
});

sampleIndicatorAction.onDialPress(({context, payload}) => {
    // console.log('dial was pressed', context, payload);
    if(payload.pressed === false) {
        MACTIONS[context].toggle();
    }
});

sampleIndicatorAction.onDialRotate(({context, payload}) => {
    // console.log('dial was rotated', context, payload.ticks);
    if(payload.hasOwnProperty('ticks')) {
        MACTIONS[context].manualRotate(payload.ticks);
    }
});

sampleIndicatorAction.onTouchTap(({context, payload}) => {
    // console.log('touchpanel was tapped', context, payload);
    if(payload.hold === false) {
        MACTIONS[context].toggle();
    }
});

class SampleIndicatorAction {
    constructor (context, payload) {
        this.isEncoder = payload.controller === 'Encoder';
        this.context = context;
        this.interval = null;
        this.manualValue = -1;
        if(this.isEncoder) {
            this.width = 100; // default width of the panel is 100
            this.height = 50; // default height of the panel is 50
        } else {
            this.width = 144; // default width of the icon is 72
            this.height = 144; // default width of the icon is 72
        }
        this.numModes = 5;
         // default scale of the icon is 2, which gives sharper icons on Stream Deck's keys
         // to compare, you can set this value to 1 (or look at the double-indicator-plugin example, which uses scale 1)
        this.scale = 2;
        this.iconSize = 48 * this.scale; // default size of the icon is 48
        this.color = '#EFEFEF';
        this.mode = 0;
        this.init();
        this.update();
    }

    init() {
        this.interval = setInterval(() => {
            this.update();
        }, 1000);
    }

    toggle() {
        this.mode = (this.mode + 1) % this.numModes; // 0, 1, 2, 3, 4
        this.update();
    }

    manualRotate(ticks) {
        this.mode = this.numModes + 1;
        if(this.manualValue === -1) {
            this.manualValue = Math.floor(100 / 60 * new Date().getSeconds());
        }
        this.manualValue = cycle(this.manualValue + ticks, 0, 100);
        $SD.setFeedback(this.context, {
            'value': this.manualValue,
            indicator: this.manualValue
        });
    }

    update() {
        if(this.mode === this.numModes + 1) return; // last mode is manual mode - see above 'manualRotate'
        const indicatorValue = Math.floor(100 / 60 * new Date().getSeconds());
        this.opacity = this.mode === 4 ? 0.5 : 1;
        const svg = this.createIcon();
        const icon = `data:image/svg+xml;,${svg}`;
        if(this.isEncoder) {
            let title = '';
            let indicator = {
                value: indicatorValue,
                opacity: this.opacity,
                bar_bg_c: null
            };
            if(this.mode === 1) { // indicator background changes from #111111 to #999999
                title = 'Gradient BG';
                indicator.bar_bg_c = `0:#111111,1:#999999`;
            } else if(this.mode === 2) { // indicator background changes from #003399 to #00AAFF
                title = 'Blue gradient';
                indicator.bar_bg_c = `0:#003399,1:#00AAFF`;
            } else if(this.mode === 3) {
                title = 'Default';
                indicator.bar_bg_c = null; // indicator background reset to default
            } else if(this.mode === 4) {
                title = 'Dimmed';
            }

            const payload = {
                title: title,
                value: indicatorValue,
                indicator,
                icon
            };
            $SD.setFeedback(this.context, payload);
        }
        $SD.setImage(this.context, icon);
    }

    createIcon() {
        const w = this.iconSize;
        const r = this.iconSize / (2 * this.scale);
        let fontColor = this.color;
        const modeValues = {
            fill: 'none',
            stroke: this.color,
            strokeWidth: 2
        };
        if(this.mode === 1) {
            modeValues.fill = 'red';
            modeValues.stroke = 'white';
            modeValues.strokeWidth = 0;
        } else if(this.mode === 2) {
            modeValues.fill = 'blue';
            modeValues.stroke = 'yellow';
            modeValues.strokeWidth = 4;
        } else if(this.mode === 3 || this.mode === 4) {
            modeValues.fill = 'white';
            modeValues.stroke = 'yellow';
            modeValues.strokeWidth = 1;
            fontColor = 'black';
        }
        return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${w}" viewBox="0 0 ${w} ${w}">
        <g transform="scale(${this.scale})" opacity="${this.opacity}">
            <polygon fill="${modeValues.fill}" stroke-width="${modeValues.strokeWidth}" stroke="${this.color}" points="24 36 9.89315394 43.4164079 12.5873218 27.7082039 1.17464361 16.5835921 16.946577 14.2917961 24 0 31.053423 14.2917961 46.8253564 16.5835921 35.4126782 27.7082039 38.1068461 43.4164079"></polygon>
            <text x="${r}" y="${r + r / 3}" text-anchor="middle" fill="${fontColor}" font-size="${r}">${this.mode}</text>
        </g>
    </svg>`;
    };

};



