import mongoose, { Schema, Document } from 'mongoose';

export interface IEventStat extends Document {
    eventId: string;
    stats: { [key: string]: number };
    last_updated: Date;
}

const EventStatSchema: Schema = new Schema({
    eventId: { type: String, required: true, unique: true, index: true },
    stats: { type: Map, of: Number, default: {} },
    last_updated: { type: Date, default: Date.now }
}, {
    timestamps: true,
    strict: false // Allow dynamic stat keys directly on the document if we prefer, but Map is safer
});

export default mongoose.models.EventStat || mongoose.model<IEventStat>('EventStat', EventStatSchema);
