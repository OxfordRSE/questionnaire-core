import {Answer, AnswerProperties, AnswerType, as_answers, Item, Option, Questionnaire} from "../src";
import {describe, expect, it, MockInstance, vi} from "vitest";

describe("Answer interpolation", () => {
  it("Handles individual answer", () => {
    const props: AnswerProperties = {
      type: AnswerType.RADIO,
      content: 1,
      label: 'boo'
    };
    const ans = new Answer(props, 'test');
    expect(ans instanceof Answer).to.eq(true);
    expect(ans.content).to.eq(1);
    expect(ans.id).to.eq("test");
  })

  it("Handles array of answers", () => {
    const props: AnswerProperties[] = [
      {
        type: AnswerType.TEXT,
        content: 1,
        label: 'boo'
      },
      {
        type: AnswerType.NUMBER,
        content: 1,
        label: 'boo'
      },
    ];
    const answers: Answer[] = as_answers(props, "test");
    expect(answers[0] instanceof Answer).to.eq(true);
    expect(answers[0].id).to.eq("test_a0");
    expect(answers[1] instanceof Answer).to.eq(true);
    expect(answers[1].id).to.eq("test_a1");
  })

  it("Handles nested (extra) answers", () => {
    const props: AnswerProperties = {
      type: AnswerType.RADIO,
      options: [{content: 0}],
      content: 0,
      label: 'boo',
      extra_answers: {
          type: AnswerType.TEXT,
          content: 1,
          label: 'hiss'
        }
    };
    const answers: Answer[] = as_answers(props, "test");
    expect(answers[0] instanceof Answer).to.eq(true);
    expect(answers[0].extra_answers[0] instanceof Answer).to.eq(true);
  })
})

describe("Option interpolation", () => {
  it("Handles basic option conversion", () => {
    const props: AnswerProperties = {
      type: AnswerType.RADIO,
      content: 1,
      label: 'boo',
      options: [
        { label: 'a' },
        { label: 'b' }
      ]
    };
    const ans = new Answer(props, 'test');
    expect(ans.options[0] instanceof Option).to.eq(true);
    expect(ans.options[1].id).to.eq("test_o1");
  })

  it("Handles nested option conversion", () => {
    const props: AnswerProperties = {
      type: AnswerType.RADIO,
      content: 1,
      label: 'boo',
      options: [
        { label: 'a' },
        {
          label: 'b',
          extra_answers: [
            { type: AnswerType.RADIO, options: [ { label: 'a' }]}
          ]
        }
      ]
    };
    const ans = new Answer(props, 'test');
    expect(ans.options[1].extra_answers[0].options[0] instanceof Option).to.eq(true);
    expect(ans.options[1].extra_answers[0].options[0].id).to.eq("test_o1_a0_o0");
  })
})

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
          answers: [
            {
              id: "item_1_answer",
              content: undefined,
              type: AnswerType.TEXT
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
    // @ts-ignore
    const check: MockInstance = vi.spyOn(Q.getItemById("item_1").answer, 'find_issues');

    expect(Q.current_item?.id).to.eq("item_0");
    Q.next_q();
    expect(Q.current_item?.id).to.eq("item_1");
    Q.current_item.answer.content = "xx";
    Q.next_q();
    // @ts-ignore
    expect(check).toHaveBeenCalled();
    const a = Q.getItemById("item_1").answer;
    expect(a.content).to.eq("xx");
    expect(Q.getItemById("item_1").last_changed_answer?.content).to.eq("xx");
    expect(Q.current_item?.id).to.eq("item_3");
    Q.next_q();
    // @ts-ignore
    expect(nav).toHaveBeenCalled();
    expect(Q.current_item?.id).to.eq("item_2");
    Q.next_q();
    // @ts-ignore
    expect(end).toHaveBeenCalled();
    const row = Q.items[1].as_rows;
    expect(row instanceof Array).to.eq(true);
    expect(row.length).to.eq(1);
    expect(row[0].id).to.eq('item_1_a0');
    expect(row[0].data_id).to.eq('item_1_answer');
    expect(row[0].content).to.eq('xx');
  })
})

