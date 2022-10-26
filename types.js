"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContentChangeSource = exports.AnswerType = void 0;
/**
 * AnswerType controls how frontends render answers
 */
var AnswerType;
(function (AnswerType) {
    AnswerType[AnswerType["UNKNOWN"] = 0] = "UNKNOWN";
    AnswerType[AnswerType["NONE"] = 1] = "NONE";
    AnswerType[AnswerType["TEXT"] = 2] = "TEXT";
    AnswerType[AnswerType["NUMBER"] = 3] = "NUMBER";
    AnswerType[AnswerType["RADIO"] = 4] = "RADIO";
    AnswerType[AnswerType["SELECT"] = 5] = "SELECT";
    AnswerType[AnswerType["CHECKBOX"] = 6] = "CHECKBOX";
    AnswerType[AnswerType["DATE"] = 7] = "DATE";
    AnswerType[AnswerType["TIME"] = 8] = "TIME";
})(AnswerType = exports.AnswerType || (exports.AnswerType = {}));
var ContentChangeSource;
(function (ContentChangeSource) {
    ContentChangeSource[ContentChangeSource["Reset"] = 0] = "Reset";
    ContentChangeSource[ContentChangeSource["User"] = 1] = "User";
})(ContentChangeSource = exports.ContentChangeSource || (exports.ContentChangeSource = {}));
