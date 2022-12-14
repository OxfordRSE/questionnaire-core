import type { Item, Questionnaire } from "./classes";
import {Answer, Counter, CounterSet, Option} from "./classes";

/**
 * AnswerType controls how frontends render answers
 */
export enum AnswerType {
  UNKNOWN,
  NONE,
  TEXT,
  NUMBER,
  RADIO,
  SELECT,
  CHECKBOX,
  DATE,
  TIME,
  DATETIME,
  DATE_RANGE,
  TIME_RANGE,
  DATETIME_RANGE,
  TEXTAREA,
}

/**
 * If an Answer is to be required, this should be reflected by checking
 * for an appropriate content in check_answer_fun()
 * check_answer_fun should return a string describing the issue if it does not return false
 */
export type AnswerProperties = {
  id?: string;
  type: AnswerType,
  default_content?: any,
  validators?: AnswerValidator[],
  to_row_fun?: (self: Answer, include_children?: boolean) => AnswerRow | AnswerRow[];
  label?: string,
  extra_answers?: AnswerLike | AnswerLike[],
  options?: OptionLike[],
  [key: string]: any;
}

export enum ContentChangeSource {
  Reset,
  User
}

/**
 * raw_content represents content without default wrapping
 * content is used for content with default wrapping
 *
 * data_id can be used to specify a friendly name for the Answer
 * when converted to tabular data format
 */
export interface AnswerInterface {
  readonly id: string;
  readonly data_id?: string;
  type: AnswerType;
  default_content: any;
  raw_content: any;
  content: any;
  selected_option: Option | undefined;
  reset_content: () => void;
  content_changed: boolean;
  last_answer_utc_time: string | undefined;
  content_history: {utc_time: string, content: any, source: ContentChangeSource}[];
  validators: AnswerValidator[];
  validation_issues: AnswerValidationIssue[];
  own_validation_issues: AnswerValidationIssue[];
  check_validation: (current_item: Item, state: Questionnaire, include_children?: boolean) => ValidationIssue[];
  to_row: (include_children?: boolean) => AnswerRow | AnswerRow[];
  label?: string;
  extra_answers: Answer[];
  options?: Option[];
  [key: string]: any;
}

export interface AnswerRow {
  id: string;
  data_id: string;
  type: string;
  content: string | number | boolean | undefined;
  label: string | undefined;
  answer_utc_time: string | undefined;
  [key: string]: string | number | boolean | undefined;
}

/**
 * Describes answer options for select, radio, checkbox, etc.
 *
 * 'extra' field can be used for representing 'other' type answers, e.g.
 * const opts: OptionDetails = {
 *   label: "other",
 *   content: 8
 *   extra: {type: AnswerType.TEXT}
 * }
 */
export type OptionProperties = {
  content?: string | number | boolean,
  label: string;
  extra_answers?: AnswerLike[];
  [key: string]: any;
} | {
  content: string | number | boolean,
  label?: string;
  extra_answers?: AnswerLike[];
  [key: string]: any;
}

/**
 * content inherits from label if content is blank and label is specified
 */
export interface OptionInterface {
  id: string;
  content: string | number | boolean;
  label?: string;
  extra_answers: Answer[];
  [key: string]: any;
}

/**
 * An Item consists of a unique id, question text, zero or more answer templates,
 * and functions describing how to act following an answer and which item to go to next.
 *
 *  next_item can be one of:
 *  - string = go to item with that id
 *  - null = go to the next item in the list, or end if it doesn't exist
 *  - false = end immediately
 */
export type ItemProperties = {
  id: string;
  question: string;
  answers?: AnswerLike[];
  process_answer_fun?: ProcessAnswerFun;
  validators?: ItemValidator[];
  next_item?: string | null | false;
  next_item_fun?: NextItemFun;
};

/**
 * Items are usually interacted with only via the Questionnaire that owns them.
 *
 * answer is a helper to easily access a single Answer.
 * Accessing it where there answers has length !== 1 will result in an error.
 *
 * last_changed_answer contains the last answer to have been changed.
 */
export interface ItemInterface {
  readonly id: string;
  readonly question: string;
  readonly handleAnswer: ProcessAnswerFun;
  readonly getNextItemId: NextItemFun;
  readonly conditional_routing: boolean; // used for heuristic testing

  answers: Answer[];
  answer: Answer;
  last_changed_answer: Answer | undefined;
  answer_utc_time?: string;

  validators: ItemValidator[];
  validation_issues: ValidationIssue[];
  own_validation_issues: ItemValidationIssue[];
  check_validation: (state: Questionnaire, include_children: boolean) => ValidationIssue[];

  next_item: (last_changed_answer: Answer | undefined, current_item: Item, state: Questionnaire) => Item | undefined;
  as_rows: AnswerRow[];
}

/**
 * Questionnaires consist of a list of items and a callback to
 * execute when the items have been completed.
 */
export type QuestionnaireProperties = {
  name: string;
  introduction: string;
  citation?: string;
  version?: string;
  items: (Item | ItemProperties)[];
  onComplete: (state: Questionnaire) => void;
  reset_items_on_back?: boolean;
};

/**
 * Questionnaires proceed through their Items by collecting answers and
 * determining the next Item on the basis of the answer.
 *
 * Support for undoing actions is provided via Questionnaire.last_q()
 *
 * The output of a Questionnaire is returned using Questionnaire.data
 */
export interface QuestionnaireInterface {
  readonly name: string;
  readonly introduction: string;
  readonly citation?: string;
  readonly version?: string;
  readonly counters: CounterSet;
  readonly items: Item[];
  readonly onComplete: (state: Questionnaire) => void;
  reset_items_on_back: boolean;

  current_item: Item | undefined;
  item_history: Item[] | [];

  next_q: (ans: AnswerLike) => void;  // Advance to the next question
  last_q: () => void;  // Go back, undoing last answer
  
  // List all issues 
  validation_issues: ValidationIssue[];
  check_validation: () => ValidationIssue[];

  getItemById: (id: string) => Item;
  next_item_in_sequence_id: string | null;

  data: any;  // retrieve answer data
}

/**
 * Counters track the operations made to them by Items.
 * This allows the counters' state to be restored if an Item's answer is undone.
 */
export type CounterOperation = {
  owner: Item;
  operation: (current_content: number) => number;
};

/**
 * Update counters as a consequence of an Answer.
 */
export type ProcessAnswerFun = (
  last_changed_answer: Answer | undefined,
  current_item: Item,
  state: Questionnaire
) => void;

/**
 * Determine the next item to go to.
 * Occurs after counters have been updated.
 *
 * last_changed_answer is the content of the last answer modified for this item.
 *
 *  NextItemFun returns one of:
 *  - string id of item to go to
 *    - if this Item doesn't exist, an error will be thrown
 *  - null to end questionnaire
 */
export type NextItemFun = (
  last_changed_answer: Answer | undefined,
  current_item: Item,
  state: Questionnaire
) => string | null;

/**
 * A Counter is defined by a unique name.
 * Counter contents can be altered by an Item,
 * and an Item's alterations to the Counter can be reverted.
 */
export interface CounterInterface {
  name: string;
  content: number;

  increment_content: (amount: number, source: Item) => void;
  revert: (source: Item) => void;
}

/**
 * A CounterSet groups a set of Counters together inside a Questionnaire
 * and exposes the underlying set/increment/revert interface of the Counters.
 */
export interface CounterSetInterface {
  counters: Counter[];

  get: (name: string, default_content: number | null) => number;
  set: (name: string, content: number, source?: Item) => void;
  increment: (name: string, content: number, source?: Item) => void;
  revert: (source: Item) => void;
}

export enum ValidationIssueLevel {
  INFO,
  WARNING,
  ERROR
}
export interface ItemValidationIssue {
  item_id: string,
  level: ValidationIssueLevel,
  issue: string,
  validator: ItemValidator,
  last_checked_utc_time: string,
}
export interface AnswerValidationIssue {
  answer_id: string,
  level: ValidationIssueLevel,
  issue: string,
  validator: AnswerValidator,
  last_checked_utc_time: string,
}
export type ValidationIssue = AnswerValidationIssue | ItemValidationIssue
export type ItemValidatorFunction = (item: Item, state: Questionnaire) => string | null;
export type ItemValidator = (item: Item, state: Questionnaire) => ItemValidationIssue | null;
export type AnswerValidatorFunction = (answer: Answer, item: Item, state: Questionnaire) => string | null;
export type AnswerValidator = (answer: Answer, item: Item, state: Questionnaire) => AnswerValidationIssue | null;

/**
 * A question may or may not have one or more Answers supplied.
 */
export type AnswerLike = Answer | AnswerProperties;
export type OptionLike = Option | OptionProperties;
export type ItemLike = Item | ItemProperties;
