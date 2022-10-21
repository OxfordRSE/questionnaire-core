import type { Item, Questionnaire } from "./classes";

export type QuestionnaireProperties = {
  items: Item[];
  onComplete: (state: Questionnaire) => void;
};

export type Answer = {
  value: number;
  text?: string;
  utc_time?: string;
};

export type CounterOperation = {
  owner: Item;
  operation: (current_value: number) => number;
};
export type ProcessAnswerFun = (
  answer: Answer | undefined,
  state: Questionnaire
) => void;
// NextItemFun returns:
// - string Id of item to go to OR
// - null to end questionnaire
export type NextItemFun = (
  answer: Answer | undefined,
  state: Questionnaire
) => string | null;

export enum ItemType {
  NONE,
  RADIO,
  NUMBER,
}

export type ItemProperties = {
  id: string;
  question: string;
  type?: ItemType;
  answer_options?: Answer[];
  process_answer_fun?: ProcessAnswerFun;
  // next_item:
  // - string = go to item with that Id
  // - null = go to the next item in the list, or end if it doesn't exist
  // - false = end
  next_item?: string | null | false;
  next_item_fun?: NextItemFun;
};
