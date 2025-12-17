import { BaseEntity, Column, Entity, OneToMany, PrimaryColumn } from 'typeorm';
import { EvaluationTable } from '@/models/evaluation/evaluation';

@Entity()
export class BenchmarkTable extends BaseEntity {
    @PrimaryColumn({ nullable: false })
    name: string;

    @Column()
    description: string;

    @Column()
    totalTasks: number;

    @OneToMany(
        () => EvaluationTable,
        (evaluation) => evaluation.benchmarkName,
        {
            cascade: true,
            onDelete: 'CASCADE',
        },
    )
    evaluations: EvaluationTable[];
}
