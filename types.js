"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContentChangeSource = exports.AnswerType = void 0;
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
var ContentChangeSource;
(function (ContentChangeSource) {
    ContentChangeSource[ContentChangeSource["Reset"] = 0] = "Reset";
    ContentChangeSource[ContentChangeSource["User"] = 1] = "User";
})(ContentChangeSource = exports.ContentChangeSource || (exports.ContentChangeSource = {}));
