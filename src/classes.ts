import type {
  AnswerInterface,
  AnswerLike,
  AnswerProperties,
  CounterInterface,
  CounterOperation,
  CounterSetInterface,
  ItemInterface,
  ItemLike,
  ItemProperties,
  NextItemFun, OptionInterface, OptionLike, OptionProperties,
  ProcessAnswerFun,
  QuestionnaireInterface,
  QuestionnaireProperties,
} from "./types";
import {AnswerType, ContentChangeSource} from "./types";

export class Questionnaire implements QuestionnaireInterface {
  readonly counters: CounterSet;
  readonly items: Item[];
  readonly onComplete: (state: Questionnaire) => void;

  private _data: any = undefined;
  current_item: Item | undefined;
  item_history: Item[] = [];

  constructor(props: QuestionnaireProperties) {
    this.items = as_items(props.items);
    this.onComplete = props.onComplete;
    this.counters = new CounterSet(this);

    if (!this.items.length) throw `Questionnaire requires at least one item`;
    this.current_item = this.items[0];
  }

  next_q() {
    if (typeof this.current_item === "undefined") {
      throw `Cannot process next_q for undefined current_item [${this.item_history.map(
        (i) => i.id
      )}]`;
    }
    // Process answer
    this.current_item.handleAnswer(this.current_item.last_changed_answer, this.current_item, this);
    this.item_history.push(this.current_item);

    const fails = this.current_item.find_issues(this);

    if (fails) {
      console.warn(
        "Cannot proceed for the following reasons:",
        ...fails
      );
      return;
    }
    this.current_item = this.current_item.next_item(
      this.current_item.last_changed_answer?.content,
      this.current_item,
      this
    );
    if (!this.current_item) this.onComplete(this);
  }

  last_q() {
    if (typeof this.current_item !== "undefined")
      this.current_item.answers.forEach(a => a.reset_content());
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

  set data(content: any) {
    this._data = content;
  }
}

export class Counter implements CounterInterface {
  _name: string;
  _operations: CounterOperation[] = [];
  _initial_content: number;

  constructor(name: string, initial_content: number = 0) {
    if (!name.length) throw "A Counter must have a name";
    this._name = name;
    this._initial_content = initial_content;
  }

  set name(s: string) {
    this._name = s;
  }

  get name(): string {
    return this._name;
  }

  /**
   * Register an Item's setting of the counter content
   */
  set_content(new_content: number, source: Item) {
    this._operations.push({
      owner: source,
      operation: () => new_content,
    });
  }

  get content(): number {
    let content: number = this._initial_content;
    this._operations.forEach((o) => (content = o.operation(content)));
    return content;
  }

  /**
   * Register an Item's incrementing of the counter content
   */
  increment_content(increment: number, source: Item): void {
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

export class CounterSet implements CounterSetInterface {
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

  _create_counter(name: string, initial_content: number): Counter {
    const counter: Counter = new Counter(name, initial_content);
    this.counters.push(counter);
    return counter;
  }

  /**
   * Return the content of a counter, or default_content if the counter
   * does not exist yet. If default_content is null and the counter
   * does not yet exist, throw an error.
   */
  get(name: string, default_content: number | null = null): number {
    try {
      return this._find_counter(name).content;
    } catch (e: any) {
      if (default_content !== null) return default_content;
      throw e;
    }
  }

  /**
   * Register Item setting Counter to content
   */
  set(name: string, content: number, source?: Item) {
    if (!source) {
      if (this._state.current_item) source = this._state.current_item;
      else throw "Cannot determine counter operation source";
    }
    let counter: Counter;
    try {
      counter = this._find_counter(name);
    } catch (e) {
      counter = this._create_counter(name, content);
    }
    counter.set_content(content, source);
  }

  /**
   * Register Item incrementing Counter by content
   */
  increment(name: string, content: number = 1, source?: Item): void {
    if (!source) {
      if (this._state.current_item) source = this._state.current_item;
      else throw "Cannot determine counter operation source";
    }
    let counter: Counter;
    try {
      counter = this._find_counter(name);
      counter.increment_content(content, source);
    } catch (e) {
      counter = this._create_counter(name, content);
    }
  }

  /**
   * Remove all Item's actions for all counters
   */
  revert(source: Item) {
    this.counters.forEach((c) => c.revert(source));
  }
}

export class Item implements ItemInterface {
  readonly id: string;
  readonly question: string;
  readonly handleAnswer: ProcessAnswerFun;
  readonly getNextItemId: NextItemFun;
  readonly conditional_routing: boolean; // used for heuristic testing

  answers: Answer[];
  answer_utc_time?: string;

  constructor(props: ItemProperties) {
    if (!props.id) throw "An Item must have an id";
    this.id = props.id;
    if (!props.question) throw "An Item must have a question";
    this.question = props.question;
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
            last_answer_content: any,
            current_item: Item,
            state: Questionnaire
          ) => {
            if (!(current_item instanceof Item)) {
              throw "Cannot determine next item from undefined item";
            }
            const i = state.items.indexOf(current_item);
            if (state.items.length <= i + 1) {
              return null;
            }
            return state.items[i + 1].id;
          };
        } else {
          // null, undefined, and false are already removed
          this.getNextItemId = () => <string>props.next_item;
        }
      }
      this.conditional_routing = false;
    }
    const answers = props.answers? as_answers(props.answers, this.id) : [];
    this.answers = answers instanceof Array? answers : [answers];
  }

  next_item(
    last_changed_answer: Answer | undefined,
    current_item: Item,
    state: Questionnaire
  ): (Item | undefined) {
    const item_id = this.getNextItemId(last_changed_answer, current_item, state);
    if (item_id === null) return undefined;
    const item = state.items.find((i) => i.id === item_id);
    if (!item) throw `Cannot find next_item with id ${item_id}`;
    return item;
  }

  get answer(): Answer {
    if (this.answers.length !== 1)
      throw `Property 'answer' can only be used where answers.length === 1`;
    return this.answers[0];
  }
  get last_changed_answer(): Answer | undefined {
    let first = null;
    let date = new Date(0);
    this.answers.forEach(a => {
      if (a.last_answer_utc_time && new Date(a.last_answer_utc_time) > date) {
        first = a;
        date = new Date(a.last_answer_utc_time);
      }
    });
    if (first) return first;
    return undefined;
  };

  find_issues: (state: Questionnaire) => (string[] | false) =
    state => {
      const fails = <string[]>this.answers
        .map(a => a.find_issues(this, state))
        .filter(s => typeof s === "string")
      return fails.length? fails : false;
    }
}

export class Answer implements AnswerInterface {
  readonly id: string;
  type: AnswerType;
  default_content: any;
  content_history: { utc_time: string; content: any, source: ContentChangeSource }[] = [];
  [key: string]: any;

  constructor(props: AnswerProperties, id: string) {
    for (const k in props) {
      if (!(k in ["content"]))
        this[k] = props[k];
    }
    if (!(typeof id === "string") || id === "") throw "An Answer must have an id";
    this.id = id;
    if (!props.type) throw "An Answer must specify a type"
    this.type = props.type;
    this._content = props.content || props.starting_content || undefined;

    if (props.extra_answers) {
      this.extra_answers = as_answers(props.extra_answers, this.id);
    }

    if (props.options) {
      this.options = as_options(props.options, this.id);
    }

    if(typeof props.default_content === "undefined")
      this.default_content = undefined;
    if(typeof props.check_answer_fun === "undefined")
      this.check_answer_fun = () => false;
  }

  get raw_content(): any {
    if (this.content_changed)
      return this.content_history[this.content_history.length - 1].content;
    return undefined;
  }

  get content(): any {
    if (!this.content_changed)
      return this.default_content;
    return this.content_history[this.content_history.length - 1].content;
  }
  set content(v) {
    this.content_history.push({
      utc_time: new Date().toUTCString(),
      content: v,
      source: ContentChangeSource.User
    })
  }

  reset_content() {
    this.content_history.push({
      utc_time: new Date().toUTCString(),
      content: this.default_content,
      source: ContentChangeSource.Reset
    })
  }

  get content_changed(): boolean {
    return this.content_history.length > 0
  }

  find_issues: (current_item: Item, state: Questionnaire) => string | false =
    (current_item, state) =>
      this.check_answer_fun(this, current_item, state);

  get last_answer_utc_time(): string | undefined {
    if (this.content_history.length)
      return this.content_history[this.content_history.length - 1].utc_time;
    return undefined;
  };
}

export class Option implements OptionInterface {
  readonly id: string;
  content: string | number | boolean;
  [key: string]: any;

  constructor(props: OptionProperties, id: string) {
    for (const k in props) {
      if (!(k in ["content"]))
        this[k] = props[k];
    }

    if (!(typeof id === "string") || id === "") throw "An Option must have an id";
    this.id = id;

    if (typeof props.content === "undefined") {
      if (typeof props.label !== "undefined")
        this.content = props.label;
      else
        throw `Cannot make unlabelled Option without specifying content.`
    } else this.content = props.content;
    if (props.extra_answers) {
      this.extra_answers = as_answers(props.extra_answers, this.id);
    }
  }

}

/**
 * Props should be Answer, AnswerProperties, or arrays with those contents.
 */
export const as_answers:
  (props: AnswerLike | AnswerLike[], parent_id: string) => Answer[] | [] =
  (props, parent_id) => {
    if (props instanceof Array) {
      return props.map((p, i) => p instanceof Answer? p : new Answer(p, `${parent_id}_a${i}`));
    } else
      return [props instanceof Answer? props : new Answer(<AnswerProperties>props, `${parent_id}_a0`)];
  }

/**
 * Props should be Option, OptionProperties, or arrays with those contents.
 */
export const as_options:
  (props: OptionLike | OptionLike[], parent_id: string) => Option[] | [] =
  (props, parent_id) => {
    if (props instanceof Array) {
      return props.map((p, i) => p instanceof Option? p : new Option(p, `${parent_id}_o${i}`));
    } else
      return [props instanceof Option? props : new Option(<OptionProperties>props, `${parent_id}_o0`)];
  }

/**
 * Props should be Item, ItemProperties, or arrays with those contents.
 */
export const as_items:
  (props: ItemLike | ItemLike[]) => Item[] | [] =
  (props) => {
    if (props instanceof Array) {
      return props.map(p => p instanceof Item? p : new Item(p));
    } else
      return [props instanceof Item? props : new Item(<ItemProperties>props)];
  }
