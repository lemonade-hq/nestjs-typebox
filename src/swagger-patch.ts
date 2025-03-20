import { Type as NestType } from '@nestjs/common';
import { SchemaObjectFactory } from '@nestjs/swagger/dist/services/schema-object-factory.js';
import { Type } from '@sinclair/typebox';
import { TSchema } from '@sinclair/typebox/type';

import { isSchemaValidator } from './decorators.js';

export function patchNestJsSwagger(): void {
    if ((SchemaObjectFactory.prototype as SchemaObjectFactory & { __primatePatched?: boolean }).__primatePatched) {
        return;
    }

    const defaultExplore = SchemaObjectFactory.prototype.exploreModelSchema;
    const seenSchemaIds = new Set<string>();

    function flattenSchema(schema: TSchema, schemas: Record<string, TSchema>): TSchema {
        if (schema === null || typeof schema !== 'object') {
            return schema as TSchema;
        }

        // If this is a schema with $id, register it and return a reference
        if (schema.$id && typeof schema.$id === 'string') {
            const { $id: schemaId } = schema;

            if (!seenSchemaIds.has(schemaId)) {
                seenSchemaIds.add(schemaId);
                // Create a copy without $id and recursively flatten
                const { $id: _id, ...schemaWithoutId } = schema;
                if (schemas[schemaId]) {
                    console.warn(`Schema with ID ${schemaId} already exists. Overwriting...`);
                }
                schemas[schemaId] = flattenSchema(schemaWithoutId as TSchema, schemas);

                return Type.Ref(schemaId);
            }
        }

        // For schemas without $id, keep them nested but process their contents
        const result = { ...schema } as TSchema;

        // Handle array items
        if (schema.type === 'array' && schema.items && typeof schema.items === 'object') {
            result.items = flattenSchema(schema.items as TSchema, schemas);
        }

        // Handle object properties
        if (schema.type === 'object' && schema.properties && typeof schema.properties === 'object') {
            result.properties = {};
            for (const [key, value] of Object.entries(schema.properties)) {
                result.properties[key] = flattenSchema(value as TSchema, schemas);
            }
        }

        return result;
    }

    const extendedExplore = function (
        this: SchemaObjectFactory,
        type: NestType,
        schemas: Record<string, TSchema>,
        schemaRefsStack: string[]
    ): string {
        if (typeof type === 'function' && this['isLazyTypeFunc'](type)) {
            const factory = type as unknown as () => NestType;
            type = factory();
        }

        if (!isSchemaValidator(type)) {
            return defaultExplore.apply(this, [type, schemas, schemaRefsStack]);
        }

        const schema = type.schema;
        if (!schema || typeof schema !== 'object') {
            console.warn('Invalid schema provided to exploreModelSchema');
            return type.name;
        }

        // Flatten the schema and register it
        const flattenedSchema = flattenSchema(schema as TSchema, schemas);
        schemas[type.name] = flattenedSchema;

        return type.name;
    };

    SchemaObjectFactory.prototype.exploreModelSchema = extendedExplore;
    (SchemaObjectFactory.prototype as SchemaObjectFactory & { __primatePatched?: boolean }).__primatePatched = true;
}
