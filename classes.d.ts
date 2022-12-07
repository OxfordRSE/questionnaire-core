import type { AnswerInterface, AnswerLike, AnswerProperties, AnswerRow, AnswerValidator, AnswerValidatorFunction, AnswerValidationIssue, CounterInterface, CounterOperation, CounterSetInterface, ItemInterface, ItemLike, ItemProperties, ItemValidator, ItemValidatorFunction, ItemValidationIssue, NextItemFun, OptionInterface, OptionLike, OptionProperties, ProcessAnswerFun, QuestionnaireInterface, QuestionnaireProperties, ValidationIssue } from "./types";
import { AnswerType, ContentChangeSource, ValidationIssueLevel } from "./types";
export declare class Questionnaire implements QuestionnaireInterface {
    readonly name: string;
    readonly introduction: string;
    readonly citation?: string;
    readonly version?: string;
    readonly counters: CounterSet;
    readonly items: Item[];
    readonly onComplete: (state: Questionnaire) => void;
    reset_items_on_back: boolean;
    private _data;
    current_item: Item | undefined;
    item_history: Item[];
    validation_issues: ValidationIssue[];
    constructor(props: QuestionnaireProperties);
    next_q(): void;
    last_q(): void;
    getItemById(id: string): Item;
    get data(): any;
    set data(content: any);
    get next_item_in_sequence_id(): string | null;
    check_validation(): ValidationIssue[];
}
export declare class Counter implements CounterInterface {
    _name: string;
    _operations: CounterOperation[];
    _initial_content: number;
    constructor(name: string, initial_content?: number);
    set name(s: string);
    get name(): string;
    /**
     * Register an Item's setting of the counter content
     */
    set_content(new_content: number, source: Item): void;
    get content(): number;
    /**
     * Register an Item's incrementing of the counter content
     */
    increment_content(increment: number, source: Item): void;
    /**
     * Remove all operations associated with an Item
     */
    revert(source: Item): void;
}
export declare class CounterSet implements CounterSetInterface {
    counters: Counter[];
    private readonly _state;
    constructor(state: Questionnaire);
    _find_counter(name: string): Counter;
    _create_counter(name: string, initial_content: number): Counter;
    /**
     * Return the content of a counter, or default_content if the counter
     * does not exist yet. If default_content is null and the counter
     * does not yet exist, throw an error.
     */
    get(name: string, default_content?: number | null): number;
    /**
     * Register Item setting Counter to content
     */
    set(name: string, content: number, source?: Item): void;
    /**
     * Register Item incrementing Counter by content
     */
    increment(name: string, content?: number, source?: Item): void;
    /**
     * Remove all Item's actions for all counters
     */
    revert(source: Item): void;
}
export declare class Item implements ItemInterface {
    readonly id: string;
    readonly question: string;
    readonly handleAnswer: ProcessAnswerFun;
    readonly getNextItemId: NextItemFun;
    readonly conditional_routing: boolean;
    answers: Answer[];
    answer_utc_time?: string;
    validators: ItemValidator[];
    own_validation_issues: ItemValidationIssue[];
    validation_issues: ValidationIssue[];
    constructor(props: ItemProperties);
    next_item(last_changed_answer: Answer | undefined, current_item: Item, state: Questionnaire): (Item | undefined);
    get answer(): Answer;
    get last_changed_answer(): Answer | undefined;
    check_validation(state: Questionnaire, include_children?: boolean): ValidationIssue[];
    get as_rows(): AnswerRow[];
}
export declare const item_validator: (fn: ItemValidatorFunction, level?: ValidationIssueLevel) => ItemValidator;
export declare const ItemValidatorsWithProps: {
    [name: string]: (props: any) => ItemValidator;
};
export declare const ItemValidators: {
    [name: string]: ItemValidator;
};
export declare const answer_validator: (fn: AnswerValidatorFunction, level?: ValidationIssueLevel) => AnswerValidator;
export declare const AnswerValidators: {
    [name: string]: AnswerValidator;
};
export declare const AnswerValidatorsWithProps: {
    [name: string]: (props: any) => AnswerValidator;
};
export declare class Answer implements AnswerInterface {
    readonly id: string;
    readonly data_id?: string;
    type: AnswerType;
    default_content: any;
    content_history: {
        utc_time: string;
        content: any;
        source: ContentChangeSource;
    }[];
    validators: AnswerValidator[];
    validation_issues: AnswerValidationIssue[];
    own_validation_issues: AnswerValidationIssue[];
    extra_answers: Answer[];
    [key: string]: any;
    constructor(props: AnswerProperties, id: string);
    get raw_content(): any;
    get content(): any;
    set content(v: any);
    reset_content(): void;
    get content_changed(): boolean;
    get selected_option(): Option | undefined;
    check_validation(current_item: Item, state: Questionnaire, include_children?: boolean): AnswerValidationIssue[];
    get last_answer_utc_time(): string | undefined;
    to_row: (include_children?: boolean) => AnswerRow | AnswerRow[];
}
export declare class Option implements OptionInterface {
    readonly id: string;
    content: string | number | boolean;
    extra_answers: Answer[];
    [key: string]: any;
    constructor(props: OptionProperties, id: string);
}
/**
 * Props should be Answer, AnswerProperties, or arrays with those contents.
 */
export declare const as_answers: (props: AnswerLike | AnswerLike[], parent_id: string) => Answer[] | [];
/**
 * Props should be Option, OptionProperties, or arrays with those contents.
 */
export declare const as_options: (props: OptionLike | OptionLike[], parent_id: string) => Option[] | [];
/**
 * Props should be Item, ItemProperties, or arrays with those contents.
 */
export declare const as_items: (props: ItemLike | ItemLike[]) => Item[] | [];
export declare const get_type_name: (t: AnswerType) => string;
