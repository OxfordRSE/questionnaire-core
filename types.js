"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ValidationIssueLevel = exports.ContentChangeSource = exports.AnswerType = void 0;
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
    AnswerType[AnswerType["DATETIME"] = 9] = "DATETIME";
    AnswerType[AnswerType["DATE_RANGE"] = 10] = "DATE_RANGE";
    AnswerType[AnswerType["TIME_RANGE"] = 11] = "TIME_RANGE";
    AnswerType[AnswerType["DATETIME_RANGE"] = 12] = "DATETIME_RANGE";
    AnswerType[AnswerType["TEXTAREA"] = 13] = "TEXTAREA";
})(AnswerType = exports.AnswerType || (exports.AnswerType = {}));
var ContentChangeSource;
(function (ContentChangeSource) {
    ContentChangeSource[ContentChangeSource["Reset"] = 0] = "Reset";
    ContentChangeSource[ContentChangeSource["User"] = 1] = "User";
})(ContentChangeSource = exports.ContentChangeSource || (exports.ContentChangeSource = {}));
var ValidationIssueLevel;
(function (ValidationIssueLevel) {
    ValidationIssueLevel[ValidationIssueLevel["INFO"] = 0] = "INFO";
    ValidationIssueLevel[ValidationIssueLevel["WARNING"] = 1] = "WARNING";
    ValidationIssueLevel[ValidationIssueLevel["ERROR"] = 2] = "ERROR";
})(ValidationIssueLevel = exports.ValidationIssueLevel || (exports.ValidationIssueLevel = {}));
