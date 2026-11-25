window.boot = function () {
    var settings = window._CCSettings;
    window._CCSettings = undefined;
    var onProgress = null;

    // ---- 启动页面适配（与游戏内 setResolution 逻辑一致） ----
    // 设计分辨率：750 x 1334（竖屏）
    var DESIGN_W = 750;
    var DESIGN_H = 1334;

    function adaptSplash () {
        var inner = document.getElementById('splash-inner');
        if (!inner) return;

        var frameW = window.innerWidth;
        var frameH = window.innerHeight;
        var ratio = frameW / frameH;
        var designRatio = DESIGN_W / DESIGN_H;  // ≈ 0.562

        var scale, offsetX, offsetY;

        if (ratio > designRatio) {
            // 屏幕更宽（pad / 横屏）：SHOW_ALL 模式
            // 等比完整显示，高度撑满，水平居中留黑边
            scale = frameH / DESIGN_H;
            offsetX = (frameW - DESIGN_W * scale) / 2;
            offsetY = 0;
        } else {
            // 屏幕更窄（竖屏手机）：FIXED_WIDTH 模式
            // 宽度撑满，高度方向自然延展（与 Cocos FIXED_WIDTH 行为一致）
            scale = frameW / DESIGN_W;
            offsetX = 0;
            offsetY = 0;
        }

        inner.style.transform = 'translate(' + offsetX + 'px, ' + offsetY + 'px) scale(' + scale + ')';
        inner.style.visibility = 'visible';
    }
    // ---- 随机名人名言 ----
    var QUOTES = [
        '思维的乐趣在于未知的可能。—— 罗素',
        '每一个难题的背后，都藏着优雅的答案。—— 怀特海',
        '耐心和恒心总会得到报酬的。—— 爱因斯坦',
        '秩序是理解世界的第一步。—— 柏拉图',
        '解开谜题，就是学会相信自己。—— 笛卡儿'
    ];
    // 启动时立即适配，并监听窗口变化
    adaptSplash();
    showRandomQuote();  // 随机选一条名言显示
    window.addEventListener('resize', adaptSplash);
    window.addEventListener('orientationchange', adaptSplash);
    // -------------------------------------------------------
    
    var RESOURCES = cc.AssetManager.BuiltinBundleName.RESOURCES;
    var INTERNAL = cc.AssetManager.BuiltinBundleName.INTERNAL;
    var MAIN = cc.AssetManager.BuiltinBundleName.MAIN;

    function showRandomQuote () {
        var el = document.getElementById('splash-quote');
        if (!el) return;
        var idx = Math.floor(Math.random() * QUOTES.length);
        el.textContent = QUOTES[idx];
    }
    // ---------------------

    function setLoadingDisplay () {
        // Loading splash scene
        var splash = document.getElementById('splash');
        onProgress = null;  // 无进度条，不做进度更新

        splash.style.display = 'block';

        cc.director.once(cc.Director.EVENT_AFTER_SCENE_LAUNCH, function () {
            splash.style.display = 'none';
        });
    }

    var onStart = function () {

        cc.view.enableRetina(true);
        cc.view.resizeWithBrowserSize(true);

        if (cc.sys.isBrowser) {
            setLoadingDisplay();
        }

        if (cc.sys.isMobile) {
            if (settings.orientation === 'landscape') {
                cc.view.setOrientation(cc.macro.ORIENTATION_LANDSCAPE);
            }
            else if (settings.orientation === 'portrait') {
                cc.view.setOrientation(cc.macro.ORIENTATION_PORTRAIT);
            }
            cc.view.enableAutoFullScreen([
                cc.sys.BROWSER_TYPE_BAIDU,
                cc.sys.BROWSER_TYPE_BAIDU_APP,
                cc.sys.BROWSER_TYPE_WECHAT,
                cc.sys.BROWSER_TYPE_MOBILE_QQ,
                cc.sys.BROWSER_TYPE_MIUI,
                cc.sys.BROWSER_TYPE_HUAWEI,
                cc.sys.BROWSER_TYPE_UC,
            ].indexOf(cc.sys.browserType) < 0);
        }

        // Limit downloading max concurrent task to 2,
        // more tasks simultaneously may cause performance draw back on some android system / browsers.
        // You can adjust the number based on your own test result, you have to set it before any loading process to take effect.
        if (cc.sys.isBrowser && cc.sys.os === cc.sys.OS_ANDROID) {
            cc.assetManager.downloader.maxConcurrency = 2;
            cc.assetManager.downloader.maxRequestsPerFrame = 2;
        }

        var launchScene = settings.launchScene;
        var bundle = cc.assetManager.bundles.find(function (b) {
            return b.getSceneInfo(launchScene);
        });
        
        bundle.loadScene(launchScene, null, onProgress,
            function (err, scene) {
                if (!err) {
                    cc.director.runSceneImmediate(scene);
                    if (cc.sys.isBrowser) {
                        // show canvas
                        var canvas = document.getElementById('GameCanvas');
                        canvas.style.visibility = '';
                        var div = document.getElementById('GameDiv');
                        if (div) {
                            div.style.backgroundImage = '';
                        }
                        console.log('Success to load scene: ' + launchScene);
                    }
                }
            }
        );

    };

    var option = {
        id: 'GameCanvas',
        debugMode: settings.debug ? cc.debug.DebugMode.INFO : cc.debug.DebugMode.ERROR,
        showFPS: settings.debug,
        frameRate: 60,
        groupList: settings.groupList,
        collisionMatrix: settings.collisionMatrix,
    };

    cc.assetManager.init({ 
        bundleVers: settings.bundleVers,
        remoteBundles: settings.remoteBundles,
        server: settings.server
    });
    
    var bundleRoot = [INTERNAL];
    settings.hasResourcesBundle && bundleRoot.push(RESOURCES);

    var count = 0;
    function cb (err) {
        if (err) return console.error(err.message, err.stack);
        count++;
        if (count === bundleRoot.length + 1) {
            cc.assetManager.loadBundle(MAIN, function (err) {
                if (!err) cc.game.run(option, onStart);
            });
        }
    }

    cc.assetManager.loadScript(settings.jsList.map(function (x) { return 'src/' + x;}), cb);

    for (var i = 0; i < bundleRoot.length; i++) {
        cc.assetManager.loadBundle(bundleRoot[i], cb);
    }
};

if (window.jsb) {
    var isRuntime = (typeof loadRuntime === 'function');
    if (isRuntime) {
        require('src/settings.fd685.js');
        require('src/cocos2d-runtime.js');
        if (CC_PHYSICS_BUILTIN || CC_PHYSICS_CANNON) {
            require('src/physics.js');
        }
        require('jsb-adapter/engine/index.js');
    }
    else {
        require('src/settings.fd685.js');
        require('src/cocos2d-jsb.js');
        if (CC_PHYSICS_BUILTIN || CC_PHYSICS_CANNON) {
            require('src/physics.js');
        }
        require('jsb-adapter/jsb-engine.js');
    }

    cc.macro.CLEANUP_IMAGE_CACHE = true;
    window.boot();
}