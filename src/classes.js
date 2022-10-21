"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Item = exports.CounterSet = exports.Counter = exports.Questionnaire = void 0;
const types_1 = require("./types");
class Questionnaire {
    constructor(props) {
        this._data = undefined;
        this.item_history = [];
        this.items = props.items;
        this.onComplete = props.onComplete;
        this.counters = new CounterSet(this);
        if (!this.items.length)
            throw `Questionnaire requires at least one item`;
        this.current_item = this.items[0];
    }
    next_q(ans) {
        if (typeof this.current_item === "undefined") {
            throw `Cannot process next_q for undefined current_item [${this.item_history.map((i) => i.id)}]`;
        }
        // Process answer
        if (typeof ans === "undefined" &&
            this.current_item.type !== types_1.ItemType.NONE) {
            console.warn(`Question ${this.current_item.id} must have an answer.`);
            return;
        }
        this.current_item.answer = ans
            ? Object.assign(Object.assign({}, ans), { utc_time: new Date().toUTCString() }) : undefined;
        this.current_item.handleAnswer(ans, this);
        this.item_history.push(this.current_item);
        this.current_item = this.current_item.next_item(ans, this);
        if (!this.current_item)
            this.onComplete(this);
    }
    last_q() {
        if (typeof this.current_item !== "undefined")
            this.current_item.answer = undefined;
        const q = this.item_history.pop();
        if (!q) {
            console.warn("No history to go_back to.");
            return;
        }
        this.counters.revert(q);
        this.current_item = q;
    }
    getItemById(id) {
        var _a;
        const item = this.items.find((i) => i.id === id);
        if (!item)
            throw `[${(_a = this.current_item) === null || _a === void 0 ? void 0 : _a.id}] Cannot find item with id ${id}`;
        return item;
    }
    get data() {
        return this._data;
    }
    set data(value) {
        this._data = value;
    }
}
exports.Questionnaire = Questionnaire;
class Counter {
    constructor(name, initial_value = 0) {
        this._operations = [];
        if (!name.length)
            throw "A Counter must have a name";
        this._name = name;
        this._initial_value = initial_value;
    }
    set name(s) {
        this._name = s;
    }
    get name() {
        return this._name;
    }
    /**
     * Register an Item's setting of the counter value
     */
    set_value(new_value, source) {
        this._operations.push({
            owner: source,
            operation: () => new_value,
        });
    }
    get value() {
        let value = this._initial_value;
        this._operations.forEach((o) => (value = o.operation(value)));
        return value;
    }
    /**
     * Register an Item's incrementing of the counter value
     */
    increment_value(increment, source) {
        this._operations.push({
            owner: source,
            operation: (x) => x + increment,
        });
    }
    /**
     * Remove all operations associated with an Item
     */
    revert(source) {
        this._operations = this._operations.filter((o) => o.owner !== source);
    }
}
exports.Counter = Counter;
class CounterSet {
    constructor(state) {
        this.counters = [];
        this._state = state;
    }
    _find_counter(name) {
        const counter = this.counters.find((c) => c.name === name);
        if (!counter)
            throw `No counter found named ${name}`;
        return counter;
    }
    _create_counter(name, initial_value) {
        const counter = new Counter(name, initial_value);
        this.counters.push(counter);
        return counter;
    }
    /**
     * Return the value of a counter, or default_value if the counter
     * does not exist yet. If default_value is null and the counter
     * does not yet exist, throw an error.
     */
    get(name, default_value = null) {
        try {
            return this._find_counter(name).value;
        }
        catch (e) {
            if (default_value !== null)
                return default_value;
            throw e;
        }
    }
    /**
     * Register Item setting Counter to Value
     */
    set(name, value, source) {
        if (!source) {
            if (this._state.current_item)
                source = this._state.current_item;
            else
                throw "Cannot determine counter operation source";
        }
        let counter;
        try {
            counter = this._find_counter(name);
        }
        catch (e) {
            counter = this._create_counter(name, value);
        }
        counter.set_value(value, source);
    }
    /**
     * Register Item incrementing Counter by Value
     */
    increment(name, value = 1, source) {
        if (!source) {
            if (this._state.current_item)
                source = this._state.current_item;
            else
                throw "Cannot determine counter operation source";
        }
        let counter;
        try {
            counter = this._find_counter(name);
            counter.increment_value(value, source);
        }
        catch (e) {
            counter = this._create_counter(name, value);
        }
    }
    /**
     * Remove all Item's actions for all counters
     */
    revert(source) {
        this.counters.forEach((c) => c.revert(source));
    }
}
exports.CounterSet = CounterSet;
class Item {
    constructor(props) {
        if (!props.id)
            throw "An Item must have an id";
        this.id = props.id;
        if (!props.question)
            throw "An Item must have a question";
        this.question = props.question;
        this.answer_options = props.answer_options || [];
        this.type =
            props.type ||
                (this.answer_options.length ? types_1.ItemType.RADIO : types_1.ItemType.NONE);
        this.handleAnswer = props.process_answer_fun || function () { };
        if (typeof props.next_item === "undefined" &&
            typeof props.next_item_fun === "undefined")
            throw `No next item property or function declared for item ${props.id}`;
        if (props.next_item_fun) {
            this.getNextItemId = props.next_item_fun;
            this.conditional_routing = true;
        }
        else {
            if (props.next_item === false) {
                // End the questionnaire
                this.getNextItemId = () => null;
            }
            else {
                if (props.next_item === null || props.next_item === undefined) {
                    this.getNextItemId = (ans, state) => {
                        if (!(state.current_item instanceof Item)) {
                            throw "Cannot determine next item from undefined item";
                        }
                        const i = state.items.indexOf(state.current_item);
                        if (state.items.length <= i + 1) {
                            return null;
                        }
                        return state.items[i + 1].id;
                    };
                }
                else {
                    // @ts-ignore because null, undefined, and false are already removed
                    this.getNextItemId = () => props.next_item;
                }
            }
            this.conditional_routing = false;
        }
    }
    get answer() {
        return this._answer;
    }
    set answer(value) {
        this._answer = value;
    }
    next_item(answer, state) {
        const item_id = this.getNextItemId(answer, state);
        if (item_id === null)
            return undefined;
        const item = state.items.find((i) => i.id === item_id);
        if (!item)
            throw `Cannot find next_item with id ${item_id}`;
        return item;
    }
}
exports.Item = Item;
