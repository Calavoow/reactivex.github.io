/// <reference path="../marble/marble.ts"/>
var Menu;
(function (Menu) {
    function selectedElement(div) {
        var imgs = div.children;
        var clickObs = Rx.Observable.fromEvent(imgs, 'click');
        clickObs.subscribe(function (mouseEvt) {
            imgs["selected"].removeAttribute("id");
            mouseEvt.target.id = "selected";
        });

        // Add circle as the default value
        var selected = new Rx.BehaviorSubject("circle");
        clickObs.map(function (mouseEvt) {
            return mouseEvt.target.getAttribute("value");
        }).subscribe(selected);
        return selected;
    }
    Menu.selectedElement = selectedElement;
})(Menu || (Menu = {}));
