function readXPath(element) {
    if (element.id !== "") {//判断id属性，如果这个元素有id，则显 示//*[@id="xPath"]  形式内容
        return '//*[@id=\"' + element.id + '\"]';
    }
    //这里需要需要主要字符串转译问题，可参考js 动态生成html时字符串和变量转译（注意引号的作用）
    if (element == document.body) {//递归到body处，结束递归
        return '/html/' + element.tagName.toLowerCase();
    }
    var ix = 1,//在nodelist中的位置，且每次点击初始化
        siblings = element.parentNode.childNodes;//同级的子元素

    for (var i = 0, l = siblings.length; i < l; i++) {
        var sibling = siblings[i];
        //如果这个元素是siblings数组中的元素，则执行递归操作
        if (sibling == element) {
            return arguments.callee(element.parentNode) + '/' + element.tagName.toLowerCase() + '[' + (ix) + ']';
            //如果不符合，判断是否是element元素，并且是否是相同元素，如果是相同的就开始累加
        } else if (sibling.nodeType == 1 && sibling.tagName == element.tagName) {
            ix++;
        }
    }
};





var nodeList = [];
NowNode = null;
var xnode = null;
var style = ""; //记录上个元素的颜色
document.addEventListener("mousemove", function () {
    oe = document.elementFromPoint(event.x, event.y);
    NowNode = oe;
    console.log(oe);
    if (xnode == null) {
        xnode = oe;
    }
    if (xnode != oe) {
        xnode.style.backgroundColor = style; //上个元素改回原来元素的背景颜色
        style = oe.style.backgroundColor;
        exist = 0;
        for (o of nodeList) {
            if (o["node"] == oe) {
                exist = 1;
                break;
            }
        }
        if (exist == 1) {
        }
        else {

            oe.style.backgroundColor = '#DDDDFF'; //设置新元素的背景元素
        }
        xnode = oe;
    }
    //对于可点击元素，屏蔽点击事件
    if (oe.style.cursor == "pointer" || oe.tagName == "A" || oe.tagName == "BUTTON" || oe.tagName == "INPUT" || oe.onclick) {
        oe.setAttribute("disabled", true);
    }
});
document.addEventListener("click", function () {
    nodeList.push({ node: NowNode, bgcolor: style, xpath: readXPath(NowNode) });
    NowNode.style.backgroundColor = "#80FFFF";
    style = "#80FFFF";
    console.log(nodeList);
    //对于可点击元素，屏蔽a标签默认点击事件
    event.stopImmediatePropagation();
    event.stopPropagation();
    event.preventDefault ? event.preventDefault() : event.returnValue = false;
});
//清除选择项
function clear() {
    //如果最后停留的元素被选中，则调整此元素的style为原始style，否则不进行调整
    for (node of nodeList) {
        node["node"].style.backgroundColor = node["bgcolor"];
        if (NowNode == node["node"]) {
            style = node["bgcolor"];
        }
    }
    nodeList.splice(0, nodeList.length); //清空数组
}

