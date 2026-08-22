import React, { useState, useMemo, useEffect } from "react";
import { 
  ChevronLeft, Bell, AlertTriangle, CheckCircle2, Clock, 
  HeartPulse, FileCheck2, Calendar, UserCheck, 
  CheckCheck, Building2, ChevronRight, Volume2, 
  Sun, Moon, Sparkles, BookOpen, User, Flame,
  ShieldCheck, Inbox, Sunrise, Sunset, Droplets,
  GraduationCap, DoorClosed, Stethoscope, Bed,
  Navigation, Users, FileText
} from "lucide-react";
import { format, isToday, parseISO } from "date-fns";
import { id } from "date-fns/locale";
import { triggerHaptic } from "../utils/animations";
import { getPamongAssignedAsramas, isFieldMusyrif } from "../utils/roleAccessUtils";
import { CloudSyncBadge } from "./CloudSyncModal";
import { SantriSakitRecord } from "./SantriSakitModal";
import { SantriIzinRecord } from "../types/izinSantri";
import { IzinRequest } from "./IzinPengajuanModal";
import { KegiatanRecord } from "./KegiatanAsramaModal";

import { SantriChangeRequest } from "../types/santriRequest";

import {
  NotificationCategory,
  SystemNotificationItem,
  CUSTOM_CALL_NAMES,
  getMusyrifCallName,
  STORAGE_KEY_READ_NOTIFS,
  getReadNotificationMap,
  markNotificationsAsRead,
  formatLocationShort,
  LOGBOOK_TASK_ACTION_NAMES,
  LOGBOOK_TASK_ICONS,
  parseTimeToTimestamp,
  formatNotificationRelativeTime,
  getLogbookNotificationDetails,
  getMutabaahNotificationDetails,
  buildSystemNotificationItems
} from "../utils/notificationUtils";

export {
  type NotificationCategory,
  type SystemNotificationItem,
  CUSTOM_CALL_NAMES,
  getMusyrifCallName,
  STORAGE_KEY_READ_NOTIFS,
  getReadNotificationMap,
  markNotificationsAsRead,
  formatLocationShort,
  LOGBOOK_TASK_ACTION_NAMES,
  LOGBOOK_TASK_ICONS,
  parseTimeToTimestamp,
  formatNotificationRelativeTime,
  getLogbookNotificationDetails,
  getMutabaahNotificationDetails,
  buildSystemNotificationItems
};

export const PageNotifikasi: React.FC<PageNotifikasiProps> = ({
  onBack,
  authUser,
  musyrifList = [],
  recordsMap = {},
  santriSakitList = [],
  santriIzinList = [],
  santriRequests = [],
  izinList = [],
  kegiatanRecords = [],
  logbookData = {},
  mutabaahData = {},
  now = new Date(),
  onGoTo,
  onOpenSantriSakit,
  onOpenSantriIzin,
  onOpenDataSantri,
  onOpenIzinMusyrif,
  onOpenKegiatan,
  onOpenLogbook,
  onOpenMutabaah,
  onOpenAlarm,
  onOpenCloudSync
}) => {
  const [activeTab, setActiveTab] = useState<NotificationCategory>("all");
  const [readIds, setReadIds] = useState<Record<string, boolean>>(() => getReadNotificationMap());

  useEffect(() => {
    const handleSync = () => {
      setReadIds(getReadNotificationMap());
    };
    window.addEventListener("presensi_notif_read_updated", handleSync);
    window.addEventListener("storage", handleSync);
    return () => {
      window.removeEventListener("presensi_notif_read_updated", handleSync);
      window.removeEventListener("storage", handleSync);
    };
  }, []);

  // Compile Dynamic Individual Notifications by Specific Role
  const notifications = useMemo(() => {
    return buildSystemNotificationItems({
      authUser,
      musyrifList,
      recordsMap,
      santriSakitList,
      santriIzinList,
      santriRequests,
      izinList,
      kegiatanRecords,
      logbookData,
      mutabaahData,
      now,
      onGoTo,
      onOpenSantriSakit,
      onOpenSantriIzin,
      onOpenDataSantri,
      onOpenIzinMusyrif,
      onOpenKegiatan,
      onOpenLogbook,
      onOpenMutabaah
    });
  }, [
    authUser, musyrifList, recordsMap, santriSakitList, santriIzinList, santriRequests,
    izinList, kegiatanRecords, logbookData, mutabaahData, now,
    onGoTo, onOpenSantriSakit, onOpenSantriIzin, onOpenDataSantri, onOpenIzinMusyrif,
    onOpenKegiatan, onOpenLogbook, onOpenMutabaah
  ]);

  // Mark all as read
  const handleMarkAllAsRead = (ids: string[]) => {
    triggerHaptic("medium");
    const updated = markNotificationsAsRead(ids);
    setReadIds(updated);
  };

  const handleItemClick = (item: SystemNotificationItem) => {
    triggerHaptic("light");
    if (!readIds[item.id]) {
      const updated = markNotificationsAsRead([item.id]);
      setReadIds(updated);
    }
    item.onAction();
  };

  // Filtered Notifications based on selected tab & sorted NEWEST on TOP
  const filteredNotifications = useMemo(() => {
    let list = notifications;
    if (activeTab === "unread") list = list.filter(n => !readIds[n.id]);
    else if (activeTab === "presensi") list = list.filter(n => n.category === "presensi");
    else if (activeTab === "santri") list = list.filter(n => n.category === "santri");
    else if (activeTab === "asrama") list = list.filter(n => n.category === "asrama" || n.category === "system");

    return [...list].sort((a, b) => {
      // 1. Newest timestamp first
      const timeA = a.timestamp ?? 0;
      const timeB = b.timestamp ?? 0;
      if (timeA !== timeB) return timeB - timeA;

      // 2. Unread items on top
      const isUnreadA = !readIds[a.id] ? 1 : 0;
      const isUnreadB = !readIds[b.id] ? 1 : 0;
      if (isUnreadA !== isUnreadB) return isUnreadB - isUnreadA;

      // 3. Priority weight
      const prioWeight = { urgent: 4, warning: 3, success: 2, info: 1 };
      return (prioWeight[b.priority] || 0) - (prioWeight[a.priority] || 0);
    });
  }, [notifications, activeTab, readIds]);

  const unreadCount = useMemo(() => {
    return notifications.filter(n => !readIds[n.id]).length;
  }, [notifications, readIds]);

  return (
    <div className="flex flex-col gap-3 sm:gap-4 pb-20">
      {/* 1. Unified Master Header Card */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 shadow-sm ring-1 ring-slate-200/70 border border-slate-100/50 flex flex-col gap-3.5">
        {/* Top row: back button + bell icon + title + actions */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={onBack}
              className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 shadow-2xs flex items-center justify-center transition-all shrink-0 active:scale-95"
              title="Kembali ke Dasbor"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-sm flex-shrink-0 bg-[#0C81E4] text-white shadow-sky-600/25">
              <Bell className="w-5 h-5"/>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-800 leading-tight truncate">
                  Pusat Notifikasi
                </h2>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 shrink-0 font-mono">
                    {unreadCount} Baru
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 font-medium truncate">
                {authUser ? `${authUser.name.split(" ")[0]} (${authUser.role.replace(/_/g, " ")})` : "Update data keasramaan"}
              </p>
            </div>
          </div>

          {/* Right Action Floating Controls */}
          <div className="flex items-center gap-1.5 shrink-0">
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => handleMarkAllAsRead(notifications.map(n => n.id))}
                className="px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold ring-1 transition-all flex items-center gap-1 shadow-2xs active:scale-95 text-[#0C4E8C] ring-sky-200 bg-sky-50 hover:bg-sky-100/80"
                title="Tandai semua sudah dibaca"
              >
                <CheckCheck className="w-3.5 h-3.5 text-[#0C81E4]" />
                <span className="hidden sm:inline">Tandai Dibaca</span>
              </button>
            )}

            {/* Sound / Alarm button */}
            <button
              type="button"
              onClick={onOpenAlarm}
              title="Pengaturan Alarm & Notifikasi Shalat"
              className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-amber-50 hover:text-amber-700 text-slate-600 shadow-2xs flex items-center justify-center transition-all active:scale-95"
            >
              <Volume2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Integrated Segmented Filter Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-0.5 scrollbar-none bg-slate-50/80 p-1.5 rounded-2xl border border-slate-100/80">
          <button
            type="button"
            onClick={() => {
              triggerHaptic("light");
              setActiveTab("all");
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === "all"
                ? "bg-white text-slate-900 shadow-xs ring-1 ring-slate-200/80"
                : "text-slate-500 hover:text-slate-800 hover:bg-white/50"
            }`}
          >
            <span>Semua</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-slate-100 text-slate-600 font-mono font-bold">
              {notifications.length}
            </span>
          </button>

          {unreadCount > 0 && (
            <button
              type="button"
              onClick={() => {
                triggerHaptic("light");
                setActiveTab("unread");
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === "unread"
                  ? "bg-rose-500 text-white shadow-xs"
                  : "text-rose-600 hover:bg-rose-50/80"
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-rose-200" />
              <span>Belum Dibaca</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-md font-mono font-bold ${
                activeTab === "unread" ? "bg-rose-600 text-white" : "bg-rose-100 text-rose-800"
              }`}>
                {unreadCount}
              </span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              triggerHaptic("light");
              setActiveTab("presensi");
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === "presensi"
                ? "bg-white text-[#0C4E8C] shadow-xs ring-1 ring-slate-200/80"
                : "text-slate-500 hover:text-slate-800 hover:bg-white/50"
            }`}
          >
            <span>Presensi Shalat</span>
          </button>

          <button
            type="button"
            onClick={() => {
              triggerHaptic("light");
              setActiveTab("santri");
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === "santri"
                ? "bg-white text-[#0C81E4] shadow-xs ring-1 ring-slate-200/80"
                : "text-slate-500 hover:text-slate-800 hover:bg-white/50"
            }`}
          >
            <span>Santri & Izin</span>
          </button>

          <button
            type="button"
            onClick={() => {
              triggerHaptic("light");
              setActiveTab("asrama");
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === "asrama"
                ? "bg-white text-amber-800 shadow-xs ring-1 ring-slate-200/80"
                : "text-slate-500 hover:text-slate-800 hover:bg-white/50"
            }`}
          >
            <span>Asrama & Rapat</span>
          </button>
        </div>
      </div>

      {/* 2. Main Unified Feed Card */}
      {filteredNotifications.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-3xl ring-1 ring-slate-200/70 border border-slate-100/50 shadow-sm p-6">
          <div className="w-12 h-12 rounded-2xl bg-sky-50 text-[#0C81E4] flex items-center justify-center mx-auto mb-2.5 shadow-2xs">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <p className="font-bold text-slate-800 text-sm">Semua Sudah Terpantau</p>
          <p className="text-xs text-slate-400 mt-0.5">Tidak ada notifikasi baru pada kategori ini.</p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl ring-1 ring-slate-200/70 border border-slate-100/50 shadow-sm divide-y divide-slate-100 overflow-hidden">
          {filteredNotifications.map((item) => {
            const isRead = !!readIds[item.id];
            const isUrgent = item.priority === "urgent";
            const isWarning = item.priority === "warning";
            const isSuccess = item.priority === "success";

            return (
              <div
                key={item.id}
                onClick={() => handleItemClick(item)}
                className={`group flex items-center gap-3 px-4 py-3 sm:py-3.5 transition-all cursor-pointer select-none ${
                  !isRead
                    ? "bg-white hover:bg-emerald-50/30"
                    : "bg-slate-50/50 hover:bg-slate-50 opacity-75 hover:opacity-100"
                }`}
              >
                {/* Left Icon Indicator with diverse representative styling */}
                {(() => {
                  let bgClasses = "bg-sky-50 text-sky-600 border border-sky-200/70";
                  let icon = <Sparkles className="w-4 h-4" />;

                  switch (item.iconType) {
                    case "moon":
                      bgClasses = "bg-indigo-50 text-indigo-600 border border-indigo-200/80";
                      icon = <Moon className="w-4 h-4" />;
                      break;
                    case "sunrise":
                      bgClasses = "bg-amber-50 text-amber-600 border border-amber-200/80";
                      icon = <Sunrise className="w-4 h-4" />;
                      break;
                    case "sunset":
                      bgClasses = "bg-orange-50 text-orange-600 border border-orange-200/80";
                      icon = <Sunset className="w-4 h-4" />;
                      break;
                    case "sun":
                      bgClasses = "bg-yellow-50 text-amber-600 border border-yellow-300/80";
                      icon = <Sun className="w-4 h-4" />;
                      break;
                    case "droplet":
                      bgClasses = "bg-sky-50 text-sky-600 border border-sky-200/80";
                      icon = <Droplets className="w-4 h-4" />;
                      break;
                    case "school":
                      bgClasses = "bg-purple-50 text-purple-600 border border-purple-200/80";
                      icon = <GraduationCap className="w-4 h-4" />;
                      break;
                    case "door":
                      bgClasses = "bg-slate-100 text-slate-700 border border-slate-300/80";
                      icon = <DoorClosed className="w-4 h-4" />;
                      break;
                    case "pulse":
                      bgClasses = "bg-rose-50 text-rose-600 border border-rose-200/80";
                      icon = <HeartPulse className="w-4 h-4" />;
                      break;
                    case "stethoscope":
                      bgClasses = "bg-rose-50 text-rose-600 border border-rose-200/80";
                      icon = <Stethoscope className="w-4 h-4" />;
                      break;
                    case "book":
                      bgClasses = "bg-emerald-50 text-emerald-600 border border-emerald-200/80";
                      icon = <BookOpen className="w-4 h-4" />;
                      break;
                    case "bed":
                      bgClasses = "bg-violet-50 text-violet-600 border border-violet-200/80";
                      icon = <Bed className="w-4 h-4" />;
                      break;
                    case "sparkles":
                      bgClasses = "bg-teal-50 text-teal-600 border border-teal-200/80";
                      icon = <Sparkles className="w-4 h-4" />;
                      break;
                    case "users":
                      bgClasses = "bg-amber-50 text-amber-700 border border-amber-200/80";
                      icon = <Users className="w-4 h-4" />;
                      break;
                    case "navigation":
                      bgClasses = "bg-cyan-50 text-cyan-600 border border-cyan-200/80";
                      icon = <Navigation className="w-4 h-4" />;
                      break;
                    case "file":
                      bgClasses = "bg-blue-50 text-blue-600 border border-blue-200/80";
                      icon = <FileText className="w-4 h-4" />;
                      break;
                    case "clock":
                      bgClasses = "bg-sky-50 text-sky-600 border border-sky-200/80";
                      icon = <Clock className="w-4 h-4" />;
                      break;
                    case "check":
                      bgClasses = "bg-emerald-50 text-emerald-600 border border-emerald-200/80";
                      icon = <CheckCircle2 className="w-4 h-4" />;
                      break;
                    default:
                      if (item.category === "santri") {
                        bgClasses = "bg-rose-50 text-rose-600 border border-rose-200/80";
                        icon = <HeartPulse className="w-4 h-4" />;
                      } else if (item.category === "asrama") {
                        bgClasses = "bg-blue-50 text-blue-600 border border-blue-200/80";
                        icon = <Building2 className="w-4 h-4" />;
                      }
                      break;
                  }

                  return (
                    <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center shrink-0 shadow-2xs ${bgClasses}`}>
                      {icon}
                    </div>
                  );
                })()}

                {/* Body Text */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <span className={`text-xs sm:text-sm font-bold truncate ${!isRead ? "text-slate-800" : "text-slate-600"}`}>
                      {item.title}
                    </span>

                    <span className="text-[10px] text-slate-400 font-mono font-medium shrink-0">
                      {item.time}
                    </span>
                  </div>

                  <p className="text-[11px] sm:text-xs text-slate-500 truncate leading-relaxed">
                    {item.message}
                  </p>
                </div>

                <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all shrink-0" />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
