import { TypeormDatabase } from '@subsquid/typeorm-store';
/**
 * Return `db` with a `repairOrphans` that raises `work_mem` for the enclosing
 * transaction and then delegates to the original, unchanged. Idempotent.
 */
export declare const withRepairOrphansWorkMem: <T extends TypeormDatabase>(db: T) => T;
/**
 * `new TypeormDatabase(...)` with the `work_mem` wrapper already installed.
 * Use this in place of the constructor at every construction site.
 */
export declare const createTypeormDatabase: (...args: ConstructorParameters<typeof TypeormDatabase>) => TypeormDatabase;
