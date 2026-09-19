import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { MOCK_FOLLOW_UPS, FollowUpTask } from '../../data/doctorMockData';
import { SectionHeader } from '../../components/doctor/common/SectionHeader';
import { StatusBadge } from '../../components/doctor/common/StatusBadge';
import { PriorityIndicator } from '../../components/doctor/common/PriorityIndicator';
import {
  Clock,
  CheckCircle2,
  Calendar,
  AlertTriangle,
  ArrowRight,
  Filter,
  Search,
  CheckSquare,
  Sparkles,
} from 'lucide-react';

export default function DoctorFollowUps() {
  const [tasks, setTasks] = useState<FollowUpTask[]>(MOCK_FOLLOW_UPS);
  const [statusFilter, setStatusFilter] = useState<'all' | 'today' | 'upcoming'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [completedTaskIds, setCompletedTaskIds] = useState<string[]>([]);

  const filteredTasks = tasks.filter((t) => {
    const matchesSearch =
      t.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.reason.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = statusFilter === 'all' || t.dueStatus === statusFilter;
    return matchesSearch && matchesFilter;
  });

  const handleToggleComplete = (id: string) => {
    setCompletedTaskIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* 1. Header */}
      <SectionHeader
        tagline="Clinical Task Manager"
        title="Follow-up Worklist"
        subtitle="Manage scheduled dosage titrations, recurring metabolic lab reviews, and proactive patient check-ins."
        badge={`${tasks.length - completedTaskIds.length} Pending`}
      />

      {/* 2. Filters */}
      <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search follow-up tasks by patient or clinical reason..."
              className="w-full pl-9 pr-4 py-2 bg-stone-50 border border-stone-200 rounded-lg text-xs placeholder-stone-400 focus:bg-white focus:outline-hidden"
            />
          </div>

          <div className="flex items-center gap-1.5 text-xs">
            {[
              { id: 'all', label: 'All Tasks' },
              { id: 'today', label: 'Due Today' },
              { id: 'upcoming', label: 'Upcoming' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id as any)}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                  statusFilter === tab.id
                    ? 'bg-stone-900 text-white'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 3. Task List Table / Cards */}
      <div className="bg-white border border-stone-200 rounded-xl overflow-hidden shadow-2xs divide-y divide-stone-100">
        {filteredTasks.length === 0 ? (
          <div className="p-12 text-center text-xs text-stone-400">
            No clinical follow-ups match your current filter.
          </div>
        ) : (
          filteredTasks.map((task) => {
            const isDone = completedTaskIds.includes(task.id);
            return (
              <div
                key={task.id}
                className={`p-4 sm:p-5 hover:bg-stone-50/80 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  isDone ? 'opacity-50 bg-stone-50/50' : ''
                }`}
              >
                <div className="flex items-start gap-3.5 flex-1">
                  <button
                    onClick={() => handleToggleComplete(task.id)}
                    className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center transition-colors cursor-pointer ${
                      isDone
                        ? 'bg-emerald-600 border-emerald-600 text-white'
                        : 'border-stone-300 hover:border-stone-500 bg-white'
                    }`}
                  >
                    {isDone && <CheckCircle2 className="w-3.5 h-3.5" />}
                  </button>

                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        to={`/doctor/patients/${task.patientId}`}
                        className={`font-semibold text-sm hover:text-emerald-800 ${
                          isDone ? 'line-through text-stone-500' : 'text-stone-900'
                        }`}
                      >
                        {task.patientName}
                      </Link>
                      <span className="font-mono text-2xs px-1.5 py-0.5 rounded bg-stone-100 text-stone-600">
                        {task.patientMrn}
                      </span>
                      <StatusBadge status={task.dueStatus} size="sm" />
                      <PriorityIndicator priority={task.priority} size="sm" />
                    </div>

                    <p className="text-xs text-stone-700 font-medium">{task.reason}</p>
                    <div className="flex items-center gap-3 text-3xs text-stone-400">
                      <span>Category: {task.category}</span>
                      <span>•</span>
                      <span>Due: {task.dueDate}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-stone-100">
                  <Link
                    to={
                      task.relatedConsultationId
                        ? `/doctor/consultations/${task.relatedConsultationId}`
                        : `/doctor/patients/${task.patientId}`
                    }
                    className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold transition-colors shadow-2xs"
                  >
                    <span>{task.nextAction}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
