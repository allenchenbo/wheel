const lotteryMap = {
    gold: {
        startNum: 1,
        endNum: 42,
        groups: [14, 14, 14],
        color: '#FFE15D',
        title: '金色轉盤轉轉轉',
    },
    red: {
        startNum: 43,
        endNum: 55,
        groups: [4, 5, 4],
        color: '#DC3535',
        title: '紅色轉盤轉轉轉',
    },
    blue: {
        startNum: 56,
        endNum: 59,
        groups: [1, 2, 1],
        color: '#39B5E0',
        title: '藍色轉盤轉轉轉',
    },
};

// Helpers
shuffle = function (o) {
    for (
        var j, x, i = o.length;
        i;
        j = parseInt(Math.random() * i), x = o[--i], o[i] = o[j], o[j] = x
    );
    return o;
};

String.prototype.hashCode = function () {
    // See http://www.cse.yorku.ca/~oz/hash.html
    var hash = 5381;
    for (i = 0; i < this.length; i++) {
        char = this.charCodeAt(i);
        hash = (hash << 5) + hash + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return hash;
};

Number.prototype.mod = function (n) {
    return ((this % n) + n) % n;
};

// 顯示結果在畫面
const viewRecords = (currentLottery, groupsIdx, colorType) => {
    let fragment;
    let recordDOMString = wheel.recordDOMString;
    let recordLiString = wheel.recordLiDOMString;
    recordLiString = recordLiString.replaceAll('*LOTTERY*', currentLottery);
    recordLiString = recordLiString.replaceAll('*COLOR*', colorType);
    if ($('.record').length === 0 || $('.record').length !== groupsIdx) {
        // create recordDOMString
        recordDOMString = recordDOMString.replaceAll('*TIMES*', groupsIdx);
        recordDOMString = recordDOMString.replaceAll('*LI*', recordLiString);
        fragment = $.parseHTML(recordDOMString);
        wheel.recordsBoxDOM.append(fragment);
        Array.apply(null, document.querySelectorAll('.records-box h2')).map((t) => {
            $(t).off('click');
            $(t).click(function () {
                $(t).parent().find('ul').toggle(400);
            });
        });
    } else {
        // get recordDOM
        fragment = new DocumentFragment();
        fragment.append($.parseHTML(recordLiString)[0]);
        document.querySelectorAll('.record ul')[groupsIdx - 1].appendChild(fragment);
    }
};

// 移除選中的項目
const removeSelectedLottery = () => {
    let segments = [...wheel.segments];
    const value = wheel.currentSegments;
    const i = segments.indexOf(value);
    segments.splice(i, 1);
    segments.sort();
    wheel.segments = segments;
    wheel.update();
};

const lotteryNum = (startNum, endNum) => {
    let lotteries = [];
    for (let i = startNum; i <= endNum; i++) {
        lotteries.push(String(i).padStart(2, '0'));
    }
    return lotteries;
};

const setTitle = (title) => {
    $('.title').html(title);
    $('title').html(title);
};

const setWheel = (eventName) => {
    // window.onbeforeunload = function (event) {
    //     let e = window.event || event;
    //     e.returnValue = '確定要關閉視窗？？';
    // };
    const { startNum, endNum, groups, color, title } = lotteryMap[eventName];
    const spinButton = document.querySelector('#spin-button');
    wheel.venues = lotteryNum(startNum, endNum);
    wheel.title = title;
    wheel.groups = groups;
    wheel.numColor = color;
    wheel.colorType = eventName;
    $('.switch-button').css('display', 'none');
    $('.wheel-box').css('display', '');
    spinButton.classList.add(`${eventName}-button`);
    spinButton.addEventListener('click', () => wheel.startSpin(), false);
    wheelInit();
};

// WHEEL!
var wheel = {
    canvasDOM: null,
    isInit: true,
    currentSegments: null,
    timerHandle: 0,
    timerDelay: 33,

    numColor: '',
    colorType: '',
    venues: [],
    title: '',
    groups: [],
    parts: 0,
    counts: 0,

    //dom
    recordsBoxDOM: '',
    recordDOMString: 'template-record',
    recordLiDOMString: 'template-record-li',

    angleCurrent: 0,
    angleDelta: 0,

    size: 290,

    canvasContext: null,

    colors: [
        '#F94144',
        '#F3722C',
        '#F8961E',
        '#F9844A',
        '#F9C74F',
        '#90BE6D',
        '#43AA8B',
        '#4D908E',
        '#577590',
        '#277DA1',
    ],

    // 目前所有數量
    segments: [],
    seg_colors: [],

    records: [],
    recordMap: {},
    // Cache of segments to colors
    maxSpeed: Math.PI / 16,

    upTime: 50,
    // How long to spin up for (in ms)
    downTime: 3000,
    // How long to slow down for (in ms)
    spinStart: 0,

    frames: 0,

    centerX: 300,
    centerY: 300,

    // 轉動輪盤  開始
    spin: function () {
        // Start the wheel only if it's not already spinning
        if (wheel.timerHandle == 0) {
            wheel.spinStart = new Date().getTime();
            // wheel.maxSpeed = Math.PI / (Math.floor(wheel.segments.length / 3) + Math.random()); // Randomly vary how hard the spin is
            wheel.maxSpeed = Math.PI / (Math.floor(wheel.segments.length / 3) + 2 + Math.random()); // Randomly vary how hard the spin is
            wheel.frames = 0;
            wheel.timerHandle = setInterval(wheel.onTimerTick, wheel.timerDelay);
        }
    },

    onTimerTick: function () {
        wheel.frames++;

        wheel.draw();

        var duration = new Date().getTime() - wheel.spinStart;
        var progress = 0;
        var finished = false;

        if (duration < wheel.upTime) {
            progress = duration / wheel.upTime;
            wheel.angleDelta = wheel.maxSpeed * Math.sin((progress * Math.PI) / 2);
        } else {
            progress = duration / wheel.downTime;
            wheel.angleDelta = wheel.maxSpeed * Math.sin((progress * Math.PI) / 2 + Math.PI / 2);
            if (progress >= 1) finished = true;
        }

        wheel.angleCurrent += wheel.angleDelta;
        while (wheel.angleCurrent >= Math.PI * 2)
            // Keep the angle in a reasonable range
            wheel.angleCurrent -= Math.PI * 2;

        if (finished) {
            clearInterval(wheel.timerHandle);
            wheel.timerHandle = 0;
            wheel.angleDelta = 0;
            // $('#counter').html((wheel.frames / duration) * 1000 + ' FPS');

            if (wheel.recordMap[wheel.currentSegments]) {
                //統計數量
                wheel.recordMap[wheel.currentSegments] = wheel.recordMap[wheel.currentSegments] + 1;
            } else {
                wheel.records.push(wheel.currentSegments);
                wheel.recordMap[wheel.currentSegments] = 1;
            }
            viewRecords(wheel.currentSegments, wheel.parts + 1, wheel.colorType);
            let max = wheel.counts;
            if (max > wheel.records.length) {
                window.setTimeout(() => wheel.startSpin(), 1000);
            } else {
                wheel.parts = wheel.parts + 1;
                wheel.counts = max + wheel.groups[wheel.parts];
                document.querySelector('#spin-button').disabled = false;
            }
        }

        // Display RPM
        // var rpm = (wheel.angleDelta * (1000 / wheel.timerDelay) * 60) / (Math.PI * 2);
        // $('#RPM').html(Math.round(rpm) + ' RPM');
    },

    init: function (optionList) {
        try {
            wheel.recordsBoxDOM = $('.records-box');
            wheel.recordDOMString = $('#template-record').html().trim();
            wheel.recordLiDOMString = $('#template-record-li').html().trim();
            wheel.initWheel();
            wheel.initCanvas();
            wheel.draw(); // first init

            $.extend(wheel, optionList);
        } catch (exceptionData) {
            alert('Wheel is not loaded ' + exceptionData);
        }
    },

    startSpin: function () {
        if (wheel.records.length !== 0) {
            removeSelectedLottery();
        }
        if (wheel.segments.length === 0) return;
        document.querySelector('#spin-button').disabled = true;
        wheel.spin();
    },

    initCanvas: function () {
        wheel.canvasDOM = $('#wheel #canvas').get(0);
        wheel.canvasContext = wheel.canvasDOM.getContext('2d');
    },

    initWheel: function () {
        shuffle(wheel.colors);
    },

    // Called when segments have changed
    update: function () {
        // Ensure we start mid way on a item
        //var r = Math.floor(Math.random() * wheel.segments.length);
        var r = 0;
        wheel.angleCurrent = ((r + 0.5) / wheel.segments.length) * Math.PI * 2;

        var segments = wheel.segments;
        var len = segments.length;
        var colors = wheel.colors;
        var colorLen = colors.length;

        // Generate a color cache (so we have consistant coloring)
        var seg_color = new Array();
        for (var i = 0; i < len; i++) seg_color.push(colors[segments[i].hashCode().mod(colorLen)]);

        wheel.seg_color = seg_color;
        wheel.draw();
    },

    draw: function () {
        wheel.clear();
        wheel.drawWheel();
        wheel.drawNeedle();
    },

    clear: function () {
        var ctx = wheel.canvasContext;
        ctx.clearRect(0, 0, 1000, 800);
    },

    drawNeedle: function () {
        var ctx = wheel.canvasContext;
        var centerX = wheel.centerX;
        var centerY = wheel.centerY;
        var size = wheel.size;

        ctx.lineWidth = 1;
        ctx.strokeStyle = '#000000';
        ctx.fileStyle = '#ffffff';

        ctx.beginPath();

        ctx.moveTo(centerX + size - 40, centerY);
        ctx.lineTo(centerX + size + 20, centerY - 10);
        ctx.lineTo(centerX + size + 20, centerY + 10);
        ctx.closePath();

        ctx.stroke();
        ctx.fill();

        // Which segment is being pointed to?
        var i =
            wheel.segments.length -
            Math.floor((wheel.angleCurrent / (Math.PI * 2)) * wheel.segments.length) -
            1;
        // Now draw the winning name
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#000000';
        ctx.font = '2rem Arial';
        if (!wheel.isInit) {
            wheel.currentSegments = wheel.segments[i];
        }
        ctx.fillText(wheel.segments[i], centerX + size + 25, centerY);
    },

    drawSegment: function (key, lastAngle, angle) {
        var ctx = wheel.canvasContext;
        var centerX = wheel.centerX;
        var centerY = wheel.centerY;
        var size = wheel.size;

        var segments = wheel.segments;
        var len = wheel.segments.length;
        var colors = wheel.seg_color;

        var value = segments[key];

        ctx.save();
        ctx.beginPath();

        // Start in the centre
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, size, lastAngle, angle, false); // Draw a arc around the edge
        ctx.lineTo(centerX, centerY); // Now draw a line back to the centre
        // Clip anything that follows to this area
        //ctx.clip(); // It would be best to clip, but we can double performance without it
        ctx.closePath();

        ctx.fillStyle = colors[key];
        ctx.fill();
        ctx.stroke();

        // Now draw the text
        ctx.save(); // The save ensures this works on Android devices
        ctx.translate(centerX, centerY);
        ctx.rotate((lastAngle + angle) / 2);

        ctx.fillStyle = '#000000';
        ctx.fillText(value.substr(0, 20), size / 2 + 80, 0); // 文字離內圈距離
        ctx.restore();

        ctx.restore();
    },

    drawWheel: function () {
        var ctx = wheel.canvasContext;

        var angleCurrent = wheel.angleCurrent;
        var lastAngle = angleCurrent;

        // var segments = wheel.segments;
        var len = wheel.segments.length;
        // var colors = wheel.colors;
        // var colorsLen = wheel.colors.length;

        var centerX = wheel.centerX;
        var centerY = wheel.centerY;
        var size = wheel.size;

        var PI2 = Math.PI * 2;

        ctx.lineWidth = 1;
        ctx.strokeStyle = '#000000';
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'center';
        ctx.font = '1.6rem Arial';

        for (var i = 1; i <= len; i++) {
            var angle = PI2 * (i / len) + angleCurrent;
            wheel.drawSegment(i - 1, lastAngle, angle);
            lastAngle = angle;
        }
        // Draw a center circle
        ctx.beginPath();
        ctx.arc(centerX, centerY, 16, 0, PI2, false);
        ctx.closePath();

        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#000000';
        ctx.fill();
        ctx.stroke();

        // Draw outer circle
        ctx.beginPath();
        ctx.arc(centerX, centerY, size, 0, PI2, false);
        ctx.closePath();

        ctx.lineWidth = 5;
        ctx.strokeStyle = '#5c6b73';
        ctx.stroke();
    },
};

const wheelInit = () => {
    wheel.isInit = true;
    wheel.init();
    setTitle(wheel.title);
    let segments = new Array();
    let values = Object.values(wheel.venues);
    $.each(values, function (key, value) {
        segments.push(String(value));
    });

    let groupsSum = _.sum(wheel.groups);
    if (groupsSum < values.length) {
        const remainder = values.length - groupsSum;
        wheel.groups.push(remainder);
    }
    wheel.counts = wheel.groups[0];

    wheel.segments = segments;
    wheel.update(); // first init
    wheel.isInit = false;
    // Hide the address bar (for mobile devices)!
    setTimeout(function () {
        window.scrollTo(0, 1);
    }, 0);
};
window.onload = function () {
    document.querySelector('.gold-button').addEventListener('click', () => setWheel('gold'), false);
    document.querySelector('.red-button').addEventListener('click', () => setWheel('red'), false);
    document.querySelector('.blue-button').addEventListener('click', () => setWheel('blue'), false);
};
