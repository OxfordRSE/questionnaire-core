import {AnswerType, Item, Questionnaire} from "../src";
import {describe, expect, it, vi} from "vitest";
import {ItemType} from "../src";

describe("Basic questionnaire flow", () => {
  it("should set current_item", () => {
    // Define a simple Questionnaire with a couple of simple questions
    const Q = new Questionnaire({
      items: [
        new Item({
          id: "item_0",
          question: "welcome",
          next_item: null
        }),
        new Item({
          id: "item_1",
          question: "name",
          answer_options: [
            {
              value: undefined,
              answer_type: AnswerType.TEXT
            }
          ],
          next_item: "item_3"
        }),
        new Item({
          id: "item_2",
          question: "skipped_once",
          next_item: false
        }),
        new Item({
          id: "item_3",
          question: "name",
          next_item_fun: answer => "item_2"
        }),
        new Item({
          id: "item_4",
          question: "never_shown",
          next_item: false
        })
      ],
      onComplete: state => {}
    });

    // @ts-ignore
    const end: MockInstance = vi.spyOn(Q, 'onComplete');
    // @ts-ignore
    const nav: MockInstance = vi.spyOn(Q.getItemById("item_3"), 'getNextItemId');

    expect(Q.current_item?.id).to.eq("item_0");
    Q.next_q(undefined);
    expect(Q.current_item?.id).to.eq("item_1");
    Q.next_q({value: "xx", answer_type: AnswerType.TEXT});
    const a = Q.getItemById("item_1").answer;
    expect("value" in a).to.eq(true);
    if ("value" in a) expect(a.value).to.eq("xx");
    expect(Q.current_item?.id).to.eq("item_3");
    Q.next_q(undefined);
    // @ts-ignore
    expect(nav).toHaveBeenCalled();
    expect(Q.current_item?.id).to.eq("item_2");
    Q.next_q(undefined);
    // @ts-ignore
    expect(end).toHaveBeenCalled();
  })
})

describe("Item typing", () => {
  it("should return NONE on empty", () => {
    const i = new Item({
      id: "test-item",
      question: "q",
      next_item: false,
      answer_options: []
    });
    expect(i.type).to.eq(ItemType.NONE);
  })

  it("should return AnswerType.* for simple lists", () => {
    const i = new Item({
      id: "test-item",
      question: "q",
      next_item: false,
      answer_options: [
        {value: 0, answer_type: AnswerType.RADIO},
        {value: 1, answer_type: AnswerType.RADIO},
        {value: 2, answer_type: AnswerType.RADIO, label: "other", extra: {
          value: "", answer_type: AnswerType.TEXT
          }},
      ]
    });
    expect(i.type).to.eq(AnswerType.RADIO);
  })

  it("should return COMPOSITE for matched lists", () => {
    const i = new Item({
      id: "test-item",
      question: "q",
      next_item: false,
      answer_options: [
        [
          {value: 0, answer_type: AnswerType.CHECKBOX},
          {value: "", answer_type: AnswerType.TEXT}
        ],
        [
          {value: 1, answer_type: AnswerType.CHECKBOX},
          {value: "", answer_type: AnswerType.TEXT}
        ],
        [
          {value: 2, answer_type: AnswerType.CHECKBOX},
          {value: "", answer_type: AnswerType.TEXT}
        ]
      ]
    });
    expect(i.type).to.eq(ItemType.COMPOSITE);
  })

  it("should return COMPLEX for mismatched lists", () => {
    const i = new Item({
      id: "test-item",
      question: "q",
      next_item: false,
      answer_options: [
        [
          {value: 0, answer_type: AnswerType.CHECKBOX},
          {value: "", answer_type: AnswerType.TEXT}
        ],
        [
          {value: 1, answer_type: AnswerType.RADIO},
          {value: "", answer_type: AnswerType.TEXT}
        ],
        [
          {value: "", answer_type: AnswerType.TEXT}
        ]
      ]
    });
    expect(i.type).to.eq(ItemType.COMPLEX);
  })
})
