import { BaseEntity, Entity, Column, PrimaryColumn } from 'typeorm';

@Entity()
export class EvaluationTable extends BaseEntity {
    @PrimaryColumn({ nullable: false })
    id: string;

    @Column()
    evaluationName: string;

    @Column()
    createdAt: string;

    @Column()
    totalRepeats: number;

    @Column()
    schemaVersion: number;

    @Column()
    evaluationDir: string;

    // Benchmark related fields
    @Column()
    benchmarkName: string;

    @Column()
    benchmarkDescription: string;

    @Column()
    benchmarkTotalTasks: number;
}
