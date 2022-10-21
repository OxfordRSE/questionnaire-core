import type {
  Answer,
  CounterOperation,
  ItemProperties,
  NextItemFun,
  ProcessAnswerFun,
  QuestionnaireProperties,
} from "./types";
import { ItemType } from "./types";

export class Questionnaire {
  readonly counters: CounterSet;
  readonly items: Item[];
  readonly onComplete: (state: Questionnaire) => void;

  private _data: any = undefined;
  current_item: Item | undefined;
  item_history: Item[] = [];

  constructor(props: QuestionnaireProperties) {
    this.items = props.items;
    this.onComplete = props.onComplete;
    this.counters = new CounterSet(this);

    if (!this.items.length) throw `Questionnaire requires at least one item`;
    this.current_item = this.items[0];
  }

  next_q(ans: Answer | undefined) {
    if (typeof this.current_item === "undefined") {
      throw `Cannot process next_q for undefined current_item [${this.item_history.map(
        (i) => i.id
      )}]`;
    }
    // Process answer
    if (
      typeof ans === "undefined" &&
      this.current_item.type !== ItemType.NONE
    ) {
      console.warn(`Question ${this.current_item.id} must have an answer.`);
      return;
    }
    this.current_item.answer = ans
      ? { ...ans, utc_time: new Date().toUTCString() }
      : undefined;
    this.current_item.handleAnswer(ans, this);
    this.item_history.push(this.current_item);
    this.current_item = this.current_item.next_item(ans, this);
    if (!this.current_item) this.onComplete(this);
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

  getItemById(id: string): Item {
    const item = this.items.find((i) => i.id === id);
    if (!item)
      throw `[${this.current_item?.id}] Cannot find item with id ${id}`;
    return item;
  }

  get data(): any {
    return this._data;
  }

  set data(value: any) {
    this._data = value;
  }
}

export class Counter {
  _name: string;
  _operations: CounterOperation[] = [];
  _initial_value: number;

  constructor(name: string, initial_value: number = 0) {
    if (!name.length) throw "A Counter must have a name";
    this._name = name;
    this._initial_value = initial_value;
  }

  set name(s: string) {
    this._name = s;
  }

  get name(): string {
    return this._name;
  }

  /**
   * Register an Item's setting of the counter value
   */
  set_value(new_value: number, source: Item) {
    this._operations.push({
      owner: source,
      operation: () => new_value,
    });
  }

  get value(): number {
    let value: number = this._initial_value;
    this._operations.forEach((o) => (value = o.operation(value)));
    return value;
  }

  /**
   * Register an Item's incrementing of the counter value
   */
  increment_value(increment: number, source: Item): void {
    this._operations.push({
      owner: source,
      operation: (x) => x + increment,
    });
  }

  /**
   * Remove all operations associated with an Item
   */
  revert(source: Item): void {
    this._operations = this._operations.filter((o) => o.owner !== source);
  }
}

export class CounterSet {
  counters: Counter[] = [];
  private readonly _state: Questionnaire;

  constructor(state: Questionnaire) {
    this._state = state;
  }

  _find_counter(name: string): Counter {
    const counter: Counter | undefined = this.counters.find(
      (c) => c.name === name
    );
    if (!counter) throw `No counter found named ${name}`;
    return counter;
  }

  _create_counter(name: string, initial_value: number): Counter {
    const counter: Counter = new Counter(name, initial_value);
    this.counters.push(counter);
    return counter;
  }

  /**
   * Return the value of a counter, or default_value if the counter
   * does not exist yet. If default_value is null and the counter
   * does not yet exist, throw an error.
   */
  get(name: string, default_value: number | null = null): number {
    try {
      return this._find_counter(name).value;
    } catch (e: any) {
      if (default_value !== null) return default_value;
      throw e;
    }
  }

  /**
   * Register Item setting Counter to Value
   */
  set(name: string, value: number, source?: Item) {
    if (!source) {
      if (this._state.current_item) source = this._state.current_item;
      else throw "Cannot determine counter operation source";
    }
    let counter: Counter;
    try {
      counter = this._find_counter(name);
    } catch (e) {
      counter = this._create_counter(name, value);
    }
    counter.set_value(value, source);
  }

  /**
   * Register Item incrementing Counter by Value
   */
  increment(name: string, value: number = 1, source?: Item): void {
    if (!source) {
      if (this._state.current_item) source = this._state.current_item;
      else throw "Cannot determine counter operation source";
    }
    let counter: Counter;
    try {
      counter = this._find_counter(name);
      counter.increment_value(value, source);
    } catch (e) {
      counter = this._create_counter(name, value);
    }
  }

  /**
   * Remove all Item's actions for all counters
   */
  revert(source: Item) {
    this.counters.forEach((c) => c.revert(source));
  }
}

export class Item {
  readonly id: string;
  readonly question: string;
  readonly answer_options: Answer[];
  readonly type: ItemType;
  readonly handleAnswer: ProcessAnswerFun;
  readonly getNextItemId: NextItemFun;
  readonly conditional_routing: boolean; // used for heuristic testing
  private _answer: Answer | undefined;

  constructor(props: ItemProperties) {
    if (!props.id) throw "An Item must have an id";
    this.id = props.id;
    if (!props.question) throw "An Item must have a question";
    this.question = props.question;
    this.answer_options = props.answer_options || [];
    this.type =
      props.type ||
      (this.answer_options.length ? ItemType.RADIO : ItemType.NONE);
    this.handleAnswer = props.process_answer_fun || function () {};
    if (
      typeof props.next_item === "undefined" &&
      typeof props.next_item_fun === "undefined"
    )
      throw `No next item property or function declared for item ${props.id}`;
    if (props.next_item_fun) {
      this.getNextItemId = props.next_item_fun;
      this.conditional_routing = true;
    } else {
      if (props.next_item === false) {
        // End the questionnaire
        this.getNextItemId = () => null;
      } else {
        if (props.next_item === null || props.next_item === undefined) {
          this.getNextItemId = (
            ans: Answer | undefined,
            state: Questionnaire
          ) => {
            if (!(state.current_item instanceof Item)) {
              throw "Cannot determine next item from undefined item";
            }
            const i = state.items.indexOf(state.current_item);
            if (state.items.length <= i + 1) {
              return null;
            }
            return state.items[i + 1].id;
          };
        } else {
          // @ts-ignore because null, undefined, and false are already removed
          this.getNextItemId = () => props.next_item;
        }
      }
      this.conditional_routing = false;
    }
  }

  get answer(): Answer | undefined {
    return this._answer;
  }

  set answer(value: Answer | undefined) {
    this._answer = value;
  }

  next_item(
    answer: Answer | undefined,
    state: Questionnaire
  ): Item | undefined {
    const item_id = this.getNextItemId(answer, state);
    if (item_id === null) return undefined;
    const item = state.items.find((i) => i.id === item_id);
    if (!item) throw `Cannot find next_item with id ${item_id}`;
    return item;
  }
}
