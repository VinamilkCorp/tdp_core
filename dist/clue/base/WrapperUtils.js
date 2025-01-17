import { AppContext } from '../../app';
import { CLUEMode, ModeWrapper } from './mode';
export class WrapperUtils {
    /**
     * injection for headless support
     * @param wrapper
     */
    static injectHeadlessSupport(wrapper) {
        const w = window;
        w.__caleydo = w.__caleydo || {};
        w.__caleydo.clue = wrapper;
        wrapper.on('jumped_to', () => {
            setTimeout(() => {
                document.body.classList.add('clue_jumped');
                prompt('clue_done_magic_key', 'test');
            }, 5000);
        });
    }
    static injectParentWindowSupport(wrapper) {
        const w = window;
        w.__caleydo = w.__caleydo || {};
        w.__caleydo.clue = wrapper;
        // initial jump
        const jumpListener = (s) => {
            window.top.postMessage({ type: 'caleydo', clue: 'jumped_to_initial' }, '*');
            wrapper.off('jumped_to', jumpListener);
        };
        wrapper.on('jumped_to', jumpListener);
        window.addEventListener('message', (event) => {
            const s = event.source;
            const d = event.data;
            if (d.type !== 'caleydo' || !d.clue) {
                return;
            }
            if (d.clue === 'jump_to') {
                wrapper
                    .jumpToState(d.state)
                    .then(() => {
                    s.postMessage({ type: 'caleydo', clue: 'jumped_to', state: d.state, ref: d.ref }, '*');
                })
                    .catch(() => {
                    s.postMessage({ type: 'caleydo', clue: 'jump_to_error', state: d.state, ref: d.ref }, '*');
                });
            }
            else if (d.clue === 'show_slide') {
                wrapper
                    .jumpToStory(d.slide)
                    .then(() => {
                    s.postMessage({ type: 'caleydo', clue: 'show_slide', slide: d.slide, ref: d.ref }, '*');
                })
                    .catch(() => {
                    s.postMessage({ type: 'caleydo', clue: 'show_slide_error', slide: d.slide, ref: d.ref }, '*');
                });
            }
            else if (d.clue === 'next_slide') {
                wrapper.nextSlide().then(() => {
                    s.postMessage({ type: 'caleydo', clue: 'next_slide', ref: d.ref }, '*');
                });
            }
            else if (d.clue === 'previous_slide') {
                wrapper.previousSlide().then(() => {
                    s.postMessage({ type: 'caleydo', clue: 'previous_slide', ref: d.ref }, '*');
                });
            }
        });
    }
    static handleMagicHashElements(body, manager) {
        // special flag for rendering server side screenshots
        if (AppContext.getInstance().hash.has('clue_headless')) {
            WrapperUtils.injectHeadlessSupport(manager);
            body.classList.add('headless');
        }
        if (AppContext.getInstance().hash.has('clue_contained')) {
            WrapperUtils.injectParentWindowSupport(manager);
            body.classList.add('headless');
        }
    }
    static triggeredByInputField(evt) {
        const src = evt.srcElement;
        const elem = evt.target;
        const inputTypes = ['input', 'select', 'textarea'];
        return (src && inputTypes.includes(src.nodeName.toLowerCase())) || (elem.nodeName && inputTypes.includes(elem.nodeName.toLowerCase()));
    }
    /**
     * enables keyboard shortcuts to undo and change mode
     * @param graph
     */
    static enableKeyboardShortcuts(graph) {
        // undo using ctrl-z
        document.addEventListener('keydown', (k) => {
            if (WrapperUtils.triggeredByInputField(k)) {
                return;
            }
            if (k.keyCode === 90 && k.ctrlKey) {
                // ctrl-z
                k.preventDefault();
                graph.undo();
            }
            else if (k.keyCode === 37 && k.ctrlKey) {
                // left arrow 	37
                ModeWrapper.getInstance().setMode(CLUEMode.modes.Exploration);
            }
            else if ((k.keyCode === 38 || k.keyCode === 40) && k.ctrlKey) {
                // up arrow 	38
                // down arrow 	40
                ModeWrapper.getInstance().setMode(CLUEMode.modes.Authoring);
            }
            else if (k.keyCode === 39 && k.ctrlKey) {
                // right arrow 	39
                ModeWrapper.getInstance().setMode(CLUEMode.modes.Presentation);
            }
        });
    }
}
//# sourceMappingURL=WrapperUtils.js.map