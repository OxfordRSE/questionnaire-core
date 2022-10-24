"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ItemType = exports.AnswerType = void 0;
/**
 * AnswerType controls how frontends render answers
 */
var AnswerType;
(function (AnswerType) {
    AnswerType[AnswerType["UNKNOWN"] = 0] = "UNKNOWN";
    AnswerType[AnswerType["RADIO"] = 1] = "RADIO";
    AnswerType[AnswerType["NUMBER"] = 2] = "NUMBER";
    AnswerType[AnswerType["CHECKBOX"] = 3] = "CHECKBOX";
    AnswerType[AnswerType["TEXT"] = 4] = "TEXT";
    AnswerType[AnswerType["DATE"] = 5] = "DATE";
    AnswerType[AnswerType["TIME"] = 6] = "TIME";
})(AnswerType = exports.AnswerType || (exports.AnswerType = {}));
/**
 * ItemType can hint to the frontend that AnswerType is not readily accessible.
 * The values should not clash with those of AnswerType, hence they are negative.
 *
 * NONE = Item does not need an answer
 * COMPOSITE = Item's answers have multiple AnswerTypes
 * COMPLEX = Item has multiple answers with different AnswerTypes
 */
var ItemType;
(function (ItemType) {
    ItemType[ItemType["NONE"] = -1] = "NONE";
    ItemType[ItemType["COMPOSITE"] = -2] = "COMPOSITE";
    ItemType[ItemType["COMPLEX"] = -3] = "COMPLEX";
})(ItemType = exports.ItemType || (exports.ItemType = {}));
