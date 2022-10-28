import type {
  AnswerInterface,
  AnswerLike,
  AnswerProperties,
  AnswerRow,
  AnswerValidator, AnswerValidatorFunction,
  CounterInterface,
  CounterOperation,
  CounterSetInterface,
  ItemInterface,
  ItemLike,
  ItemProperties,
  NextItemFun,
  OptionInterface,
  OptionLike,
  OptionProperties,
  ProcessAnswerFun,
  QuestionnaireInterface,
  QuestionnaireProperties,
  ValidationIssue,
} from "./types";
import {AnswerType, ContentChangeSource, ValidationIssueLevel} from "./types";

export class Questionnaire implements QuestionnaireInterface {
  readonly counters: CounterSet;
  readonly items: Item[];
  readonly onComplete: (state: Questionnaire) => void;

  private _data: any = undefined;
  current_item: Item | undefined;
  item_history: Item[] = [];
  validation_issues: ValidationIssue[] = [];

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

    const fails = this.current_item.check_validation(this);

    if (fails.length) {
      console.warn(
        "Cannot proceed for the following reasons:",
        ...fails
      );
      return;
    }
    this.current_item = this.current_item.next_item(
      this.current_item.last_changed_answer,
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

  get next_item_in_sequence_id(): string | null {
    if (!(this.current_item instanceof Item)) {
      throw "Cannot determine next item from undefined item";
    }
    const i = this.items.indexOf(this.current_item);
    if (this.items.length <= i + 1) {
      return null;
    }
    return this.items[i + 1].id;
  };

  check_validation() {
    const errors: ValidationIssue[] = [];
    this.items.forEach(i => errors.push(...i.check_validation(this)))
    this.validation_issues = errors;
    return this.validation_issues;
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
  validation_issues: ValidationIssue[] = [];

  constructor(props: ItemProperties) {
    if (!props.id) throw "An Item must have an id";
    this.id = props.id;
    if (!props.question) throw "An Item must have a question";
    this.question = props.question;
    this.handleAnswer = props.process_answer_fun || function () {};
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
            last_changed_answer: Answer | undefined,
            current_item: Item,
            state: Questionnaire
          ) => state.next_item_in_sequence_id;
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
    let last = null;
    let date = new Date(0);
    this.answers.forEach(a => {
      if (a.last_answer_utc_time && new Date(a.last_answer_utc_time) > date) {
        last = a;
        date = new Date(a.last_answer_utc_time);
      }
    });
    if (last) return last;
    return undefined;
  };

  check_validation(state: Questionnaire): ValidationIssue[] {
      const errors: ValidationIssue[] = [];
      this.answers.forEach(a => errors.push(...a.check_validation(this, state, true)));
      this.validation_issues = errors;
      return this.validation_issues;
  }

  get as_rows(): AnswerRow[] {
    const rows: AnswerRow[] = [];
    this.answers.forEach(a => {
      const r = a.to_row(true);
      if (r instanceof Array) rows.push(...r)
      else rows.push(<AnswerRow>r);
    });
    return rows;
  };
}

export const Validator: (fn: AnswerValidatorFunction, level?: ValidationIssueLevel) => AnswerValidator =
  (fn, level = ValidationIssueLevel.ERROR) =>
    (ans, item, state) => {
    const s = fn(ans, item, state);
    if (typeof s === "string")
      return <ValidationIssue>{
        answer_id: ans.id,
        level,
        issue: s,
        validator: fn,
        last_checked_utc_time: new Date().toUTCString(),
      };
    return null;
  }

export const Validators: { [name: string]: AnswerValidator } = {
  REQUIRED: Validator((ans) => {
    if (!ans.content_changed) return "An answer is required";
    if (typeof ans.content === "undefined") return "Answer cannot be blank";
    return null;
  }),
  NOT_BLANK: Validator((ans) => {
    if (typeof ans.content === "undefined") return "Answer cannot be blank";
    return null;
  }),
}

export const ValidatorsWithProps: { [name: string]: (props: any) => AnswerValidator } = {
  OF_TYPE: (t: string) => Validator((ans) => {
    if (typeof ans.content !== t) return `Answer must be a ${t}`;
    return null;
  }),
}

export class Answer implements AnswerInterface {
  readonly id: string;
  readonly data_id?: string;
  type: AnswerType;
  default_content: any;
  content_history: { utc_time: string; content: any, source: ContentChangeSource }[] = [];
  validators: AnswerValidator[];
  validation_issues: ValidationIssue[] = [];
  own_validation_issues: ValidationIssue[] = [];
  extra_answers: Answer[];
  [key: string]: any;

  constructor(props: AnswerProperties, id: string) {
    for (const k in props) {
      if (!(k in ["content"]))
        this[k] = props[k];
    }
    if (!(typeof id === "string") || id === "") throw "An Answer must have an id";
    this.id = id;

    if (props.id) this.data_id = props.id;

    if (typeof props.type === "undefined") throw "An Answer must specify a type"
    this.type = props.type;
    this._content = props.content || props.starting_content || undefined;

    if (props.extra_answers)
      this.extra_answers = as_answers(props.extra_answers, this.id);
    else this.extra_answers = [];

    if (props.options)
      this.options = as_options(props.options, this.id);

    if (props.default_content)
      this.default_content = props.default_content;
    else this.default_content = undefined;

    if (props.validators)
      this.validators = props.validators;
    else this.validators = [];

    if (props.to_row_fun)
      this.to_row_fun = props.to_row_fun;
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

  get selected_option(): Option | undefined {
    if (this.type !== AnswerType.RADIO)
      console.warn(`selected_option is always undefined for Answers of type ${get_type_name(this.type)}`);
    if (typeof this.content !== "undefined") {
      return this.options[this.content];
    }
    return undefined;
  }

  check_validation(current_item: Item, state: Questionnaire, include_children?: boolean): ValidationIssue[] {
    const errors: ValidationIssue[] = [];
    current_item.validation_issues = current_item.validation_issues.filter(e => e.answer_id !== this.id);
    state.validation_issues = state.validation_issues.filter(e => e.answer_id !== this.id);
    this.validators.forEach(v => {
      const s = v(this, current_item, state);
      if (s !== null) errors.push(s);
    })
    this.own_validation_issues = [...errors];
    current_item.validation_issues.push(...errors);
    state.validation_issues.push(...errors);

    this.extra_answers.forEach(a => errors.push(...a.check_validation(current_item, state, include_children)));
    this.validation_issues = errors;

    return include_children? this.validation_issues : this.own_validation_issues;
  }

  get last_answer_utc_time(): string | undefined {
    if (this.content_history.length)
      return this.content_history[this.content_history.length - 1].utc_time;
    return undefined;
  };

  to_row: (include_children?: boolean) => AnswerRow | AnswerRow[] =
    (include_children = true) => {
      if (this.to_row_fun) return this.to_row_fun(this, include_children);
      const out: AnswerRow = {
        id: this.id,
        data_id: this.data_id || this.id,
        type: get_type_name(this.type),
        content: undefined,
        label: undefined,
        answer_utc_time: undefined,
      }
      const rows = [out];
      if (include_children)
        this.extra_answers.forEach(a => rows.push(...<AnswerRow[]>a.to_row(include_children)));

      if (this.type in [AnswerType.UNKNOWN, AnswerType.NONE])
        return include_children? rows : out;
      if (this.last_answer_utc_time) out.answer_utc_time = this.last_answer_utc_time;
      if (this.type in [AnswerType.RADIO, AnswerType.SELECT]) {
        const selected = this.options[this.content];
        out.label = selected.label;
        out.content = selected.content;
        return include_children? rows : out ;
      }
      out.label = this.label;
      out.content = this.content;
      return include_children? rows : out;
    }
}

export class Option implements OptionInterface {
  readonly id: string;
  content: string | number | boolean;
  extra_answers: Answer[];
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
    } else this.extra_answers = [];
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

export const get_type_name: (t: AnswerType) => string = (t) => {
  switch(t) {
    case AnswerType.NONE: return "none";
    case AnswerType.TEXT: return "text";
    case AnswerType.NUMBER: return "number";
    case AnswerType.RADIO: return "radio";
    case AnswerType.SELECT: return "select";
    case AnswerType.CHECKBOX: return "checkbox";
    case AnswerType.DATE: return "date";
    case AnswerType.TIME: return "time";
  }
  return "unknown";
}