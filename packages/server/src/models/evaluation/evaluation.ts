import {
    BaseEntity,
    Entity,
    Column,
    PrimaryColumn,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { BenchmarkTable } from '@/models/evaluation/benchmark';

@Entity()
export class EvaluationTable extends BaseEntity {
    @PrimaryColumn({ nullable: false })
    id: string;

    @Column()
    evaluationName: string;

    @ManyToOne(() => BenchmarkTable, { nullable: false, onDelete: 'CASCADE' })
    @JoinColumn({ name: 'name' })
    benchmarkName: string;

    @Column()
    createdAt: string;

    @Column()
    totalRepeats: number;

    @Column()
    schemaVersion: number;

    @Column()
    evaluationDir: string;
}
