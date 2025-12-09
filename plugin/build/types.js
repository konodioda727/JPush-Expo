"use strict";
/**
 * JPush Config Plugin Types
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateProps = validateProps;
/**
 * 验证插件参数
 * @throws {Error} 当参数无效时抛出错误
 */
function validateProps(props) {
    if (!props) {
        throw new Error('[MX_JPush_Expo] 插件配置不能为空');
    }
    if (!props.appKey || typeof props.appKey !== 'string') {
        throw new Error('[MX_JPush_Expo] appKey 是必填项，且必须是字符串');
    }
    if (!props.channel || typeof props.channel !== 'string') {
        throw new Error('[MX_JPush_Expo] channel 是必填项，且必须是字符串');
    }
    if (props.apsForProduction !== undefined && typeof props.apsForProduction !== 'boolean') {
        throw new Error('[MX_JPush_Expo] apsForProduction 必须是布尔值');
    }
}
//# sourceMappingURL=types.js.map