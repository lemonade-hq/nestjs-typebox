import type { PipeTransform, Type } from '@nestjs/common';
import type { Static, TSchema } from '@sinclair/typebox';
import type { TypeCheck } from '@sinclair/typebox/compiler';

export type AllKeys<T> = T extends unknown ? Exclude<keyof T, symbol> : never;

export type Obj<T = unknown> = Record<string, T>;

// eslint-disable-next-line @typescript-eslint/ban-types, @typescript-eslint/no-explicit-any
export type MethodDecorator<T extends Function = any> = (
    // eslint-disable-next-line @typescript-eslint/ban-types
    target: Object,
    propertyKey: string | symbol,
    descriptor: TypedPropertyDescriptor<T>
) => TypedPropertyDescriptor<T> | void;

export interface SchemaValidator<T extends TSchema = TSchema> {
    schema: T;
    name: string;
    check: TypeCheck<T>['Check'];
    validate(data: Obj | Obj[]): Static<T>;
}
export interface ValidatorConfigBase {
    schema?: TSchema;
    coerceTypes?: boolean;
    stripUnknownProps?: boolean;
    name?: string;
    required?: boolean;
    pipes?: (PipeTransform | Type<PipeTransform>)[];
}
export interface ResponseValidatorConfig<T extends TSchema = TSchema> extends ValidatorConfigBase {
    schema: T;
    type?: 'response';
    responseCode?: number;
    required?: true;
    pipes?: never;
}

export interface ParamValidatorConfig extends ValidatorConfigBase {
    schema?: TSchema;
    type: 'param';
    name: string;
    stripUnknownProps?: never;
}

export interface QueryValidatorConfig extends ValidatorConfigBase {
    schema?: TSchema;
    type: 'query';
    name: string;
    stripUnknownProps?: never;
}

export interface BodyValidatorConfig extends ValidatorConfigBase {
    schema: TSchema;
    type: 'body';
}

export type RequestValidatorConfig = ParamValidatorConfig | QueryValidatorConfig | BodyValidatorConfig;
export type SchemaValidatorConfig = RequestValidatorConfig | ResponseValidatorConfig;

export type ValidatorType = NonNullable<SchemaValidatorConfig['type']>;

export interface ValidatorConfig<
    S extends TSchema,
    ResponseConfig extends ResponseValidatorConfig<S>,
    RequestConfigs extends RequestValidatorConfig[],
> {
    response?: S | ResponseConfig;
    request?: [...RequestConfigs];
}

export type RequestConfigsToTypes<RequestConfigs extends RequestValidatorConfig[]> = {
    [K in keyof RequestConfigs]: RequestConfigs[K]['required'] extends false
        ? RequestConfigs[K]['schema'] extends TSchema
            ? Static<RequestConfigs[K]['schema']> | undefined
            : string | undefined
        : RequestConfigs[K]['schema'] extends TSchema
          ? Static<RequestConfigs[K]['schema']>
          : string;
};
