import type { Item, Questionnaire } from "./classes";
import { Counter, CounterSet } from "./classes";
/**
 * AnswerType controls how frontends render answers
 */
export declare enum AnswerType {
    UNKNOWN = 0,
    RADIO = 1,
    NUMBER = 2,
    CHECKBOX = 3,
    TEXT = 4,
    DATE = 5,
    TIME = 6
}
/**
 * ItemType can hint to the frontend that AnswerType is not readily accessible.
 * The values should not clash with those of AnswerType, hence they are negative.
 *
 * NONE = Item does not need an answer
 * COMPOSITE = Item's answers have multiple AnswerTypes
 * COMPLEX = Item has multiple answers with different AnswerTypes
 */
export declare enum ItemType {
    NONE = -1,
    COMPOSITE = -2,
    COMPLEX = -3
}
/**
 * BaseAnswer describes the shape of an answer and can hold its actual values.
 *
 * 'extra' field can be used for representing 'other' type answers, e.g.
 * const ans: NumericAnswer = {
 *   label: "other",
 *   value: 8,
 *   extra: {value: "The question didn't really make sense to me."}
 * }
 */
export interface BaseAnswer {
    value?: any;
    answer_type: AnswerType;
    default_value?: any;
    label?: string;
    extra?: BaseAnswer | BaseAnswer[];
}
export interface NumericAnswer extends BaseAnswer {
    value: number;
}
export interface TextAnswer extends BaseAnswer {
    value: string;
}
export interface CompositeAnswer {
    value: BaseAnswer[];
}
/**
 * A question may or may not have one or more BaseAnswers supplied.
 */
export declare type Answer = BaseAnswer | BaseAnswer[] | undefined;
/**
 * Questionnaires consist of a list of items and a callback to
 * execute when the items have been completed.
 */
export declare type QuestionnaireProperties = {
    items: Item[];
    onComplete: (state: Questionnaire) => void;
};
/**
 * Counters track the operations made to them by Items.
 * This allows the counters' state to be restored if an Item's answer is undone.
 */
export declare type CounterOperation = {
    owner: Item;
    operation: (current_value: number) => number;
};
/**
 * Update counters as a consequence of an Answer.
 */
export declare type ProcessAnswerFun = (answer: Answer, state: Questionnaire) => void;
/**
 * Determine the next item to go to.
 * Occurs after counters have been updated.
 *  NextItemFun returns one of:
 *  - string id of item to go to
 *    - if this Item doesn't exist, an error will be thrown
 *  - null to end questionnaire
 */
export declare type NextItemFun = (answer: Answer, state: Questionnaire) => string | null;
/**
 * An Item consists of a unique id, question text, zero or more answer templates,
 * and functions describing how to act following an answer and which item to go to next.
 *
 * Either next_item or next_item_fun MUST be specified.
 *  next_item can be one of:
 *  - string = go to item with that id
 *  - null = go to the next item in the list, or end if it doesn't exist
 *  - false = end
 */
export declare type ItemProperties = {
    id: string;
    question: string;
    answer_options?: Answer[];
    process_answer_fun?: ProcessAnswerFun;
    next_item?: string | null | false;
    next_item_fun?: NextItemFun;
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
    readonly counters: CounterSet;
    readonly items: Item[];
    readonly onComplete: (state: Questionnaire) => void;
    current_item: Item | undefined;
    item_history: Item[] | [];
    next_q: (ans: Answer) => void;
    last_q: () => void;
    getItemById: (id: string) => Item;
    data: any;
}
/**
 * A Counter is defined by a unique name.
 * Counter values can be altered by an Item,
 * and an Item's alterations to the Counter can be reverted.
 */
export interface CounterInterface {
    name: string;
    value: number;
    increment_value: (amount: number, source: Item) => void;
    revert: (source: Item) => void;
}
/**
 * A CounterSet groups a set of Counters together inside a Questionnaire
 * and exposes the underlying set/increment/revert interface of the Counters.
 */
export interface CounterSetInterface {
    counters: Counter[];
    get: (name: string, default_value: number | null) => number;
    set: (name: string, value: number, source?: Item) => void;
    increment: (name: string, value: number, source?: Item) => void;
    revert: (source: Item) => void;
}
/**
 * Items are usually interacted with only via the Questionnaire that owns them.
 */
export interface ItemInterface {
    readonly id: string;
    readonly question: string;
    readonly answer_options: Answer[];
    readonly handleAnswer: ProcessAnswerFun;
    readonly getNextItemId: NextItemFun;
    readonly conditional_routing: boolean;
    type: AnswerType | ItemType;
    answer: Answer;
    answer_utc_time?: string;
    next_item: (ans: Answer, state: Questionnaire) => Item | undefined;
}
