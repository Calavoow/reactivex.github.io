/// <reference path="../marble/marble.ts"/>
module Menu {
	export function selectedElement(div: HTMLElement) : Rx.Observable<string> {
		var imgs = div.children
		var clickObs = <Rx.Observable<MouseEvent>> Rx.Observable.fromEvent(imgs, 'click')
		clickObs.subscribe((mouseEvt) => {
			imgs["selected"].removeAttribute("id");
			(<HTMLElement> mouseEvt.target).id = "selected"
		})
		// Add circle as the default value
		var selected = new Rx.BehaviorSubject("circle")
		clickObs.map((mouseEvt) => {
			return (<HTMLElement> mouseEvt.target).getAttribute("value")
		}).subscribe(selected)
		return selected
	}
}
