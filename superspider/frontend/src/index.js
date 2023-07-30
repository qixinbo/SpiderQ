function getUrlParam(name) {
    var reg = new RegExp("(^|&)" + name + "=([^&]*)(&|$)"); //构造一个含有目标参数的正则表达式对象
    var r = window.location.search.substr(1).match(reg); //匹配目标参数
    if (r != null) return unescape(r[2]);
    return "";
}

var app = Vue.createApp({
    data() {
        return {
            init: true,
            lang: 'zh',
            user_data_folder: getUrlParam("user_data_folder"),
            step: 0,
            newest_version: '-', // 最新版本号
        }
    },
    mounted() {
        // 发送GET请求获取GitHub的Release API响应
        const request = new XMLHttpRequest();
        request.open('GET', `https://api.github.com/repos/NaiboWang/EasySpider/releases/latest`);
        request.setRequestHeader('User-Agent', 'JavaScript');
        request.onload = function() {
            // 解析响应JSON并输出最新版本号
            const release = JSON.parse(request.responseText);
            const latestVersion = release.tag_name;
            app.$data.newest_version = latestVersion;
            // alert(`Latest version is ${latestVersion}`);
        };
        request.onerror = function() {
            console.error('Error: failed to get latest version.');
        };
        request.send();
    },
    methods: {
        // 更改语言，并关闭初始页面
        changeLang(lang = 'zh') {
            this.init = false;
            this.lang = lang;
        },
        // 开始设计
        startDesign(lang, with_data = false) {
            if (with_data) {
                console.log(this.user_data_folder)
                if (this.user_data_folder == null || this.user_data_folder == "") {
                    if (lang == 'zh') {
                        alert("请指定用户信息目录");
                    } 
                    else {
                        alert("Please specify the user information directory");
                    }
                    return;
                }
                window.electronAPI.startDesign(lang, this.user_data_folder);
            } 
            else {
                // 调用渲染进程中的全局函数startDesign，该函数在preload中被预加载，会向主进程发送start_design这个消息
                window.electronAPI.startDesign(lang);
            }
        },
        startInvoke(lang) {
            window.electronAPI.startInvoke(lang);
        }
    }
}).mount('#app');
