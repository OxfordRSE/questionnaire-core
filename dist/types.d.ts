import type { Item, Questionnaire } from "./classes";
export declare type QuestionnaireProperties = {
    items: Item[];
    onComplete: (state: Questionnaire) => void;
};
export declare type Answer = {
    value: number;
    text?: string;
    utc_time?: string;
};
export declare type CounterOperation = {
    owner: Item;
    operation: (current_value: number) => number;
};
export declare type ProcessAnswerFun = (answer: Answer | undefined, state: Questionnaire) => void;
export declare type NextItemFun = (answer: Answer | undefined, state: Questionnaire) => string | null;
export declare enum ItemType {
    NONE = 0,
    RADIO = 1,
    NUMBER = 2
}
export declare type ItemProperties = {
    id: string;
    question: string;
    type?: ItemType;
    answer_options?: Answer[];
    process_answer_fun?: ProcessAnswerFun;
    next_item?: string | null | false;
    next_item_fun?: NextItemFun;
};
