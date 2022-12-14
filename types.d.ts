import type { Item, Questionnaire } from "./classes";
import { Answer, Counter, CounterSet, Option } from "./classes";
/**
 * AnswerType controls how frontends render answers
 */
export declare enum AnswerType {
    UNKNOWN = 0,
    NONE = 1,
    TEXT = 2,
    NUMBER = 3,
    RADIO = 4,
    SELECT = 5,
    CHECKBOX = 6,
    DATE = 7,
    TIME = 8,
    DATETIME = 9,
    DATE_RANGE = 10,
    TIME_RANGE = 11,
    DATETIME_RANGE = 12,
    TEXTAREA = 13
}
/**
 * If an Answer is to be required, this should be reflected by checking
 * for an appropriate content in check_answer_fun()
 * check_answer_fun should return a string describing the issue if it does not return false
 */
export declare type AnswerProperties = {
    id?: string;
    type: AnswerType;
    default_content?: any;
    validators?: AnswerValidator[];
    to_row_fun?: (self: Answer, include_children?: boolean) => AnswerRow | AnswerRow[];
    label?: string;
    extra_answers?: AnswerLike | AnswerLike[];
    options?: OptionLike[];
    [key: string]: any;
};
export declare enum ContentChangeSource {
    Reset = 0,
    User = 1
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
    content_history: {
        utc_time: string;
        content: any;
        source: ContentChangeSource;
    }[];
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
export declare type OptionProperties = {
    content?: string | number | boolean;
    label: string;
    extra_answers?: AnswerLike[];
    [key: string]: any;
} | {
    content: string | number | boolean;
    label?: string;
    extra_answers?: AnswerLike[];
    [key: string]: any;
};
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
export declare type ItemProperties = {
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
    readonly conditional_routing: boolean;
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
export declare type QuestionnaireProperties = {
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
    next_q: (ans: AnswerLike) => void;
    last_q: () => void;
    validation_issues: ValidationIssue[];
    check_validation: () => ValidationIssue[];
    getItemById: (id: string) => Item;
    next_item_in_sequence_id: string | null;
    data: any;
}
/**
 * Counters track the operations made to them by Items.
 * This allows the counters' state to be restored if an Item's answer is undone.
 */
export declare type CounterOperation = {
    owner: Item;
    operation: (current_content: number) => number;
};
/**
 * Update counters as a consequence of an Answer.
 */
export declare type ProcessAnswerFun = (last_changed_answer: Answer | undefined, current_item: Item, state: Questionnaire) => void;
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
export declare type NextItemFun = (last_changed_answer: Answer | undefined, current_item: Item, state: Questionnaire) => string | null;
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
export declare enum ValidationIssueLevel {
    INFO = 0,
    WARNING = 1,
    ERROR = 2
}
export interface ItemValidationIssue {
    item_id: string;
    level: ValidationIssueLevel;
    issue: string;
    validator: ItemValidator;
    last_checked_utc_time: string;
}
export interface AnswerValidationIssue {
    answer_id: string;
    level: ValidationIssueLevel;
    issue: string;
    validator: AnswerValidator;
    last_checked_utc_time: string;
}
export declare type ValidationIssue = AnswerValidationIssue | ItemValidationIssue;
export declare type ItemValidatorFunction = (item: Item, state: Questionnaire) => string | null;
export declare type ItemValidator = (item: Item, state: Questionnaire) => ItemValidationIssue | null;
export declare type AnswerValidatorFunction = (answer: Answer, item: Item, state: Questionnaire) => string | null;
export declare type AnswerValidator = (answer: Answer, item: Item, state: Questionnaire) => AnswerValidationIssue | null;
/**
 * A question may or may not have one or more Answers supplied.
 */
export declare type AnswerLike = Answer | AnswerProperties;
export declare type OptionLike = Option | OptionProperties;
export declare type ItemLike = Item | ItemProperties;
