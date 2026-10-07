import os

scss_content = '''/* ==========================================================================
   SunnyBridge Home Page Styles
   Agency UI Design: High-Conversion, Polished Children Education Theme
   ========================================================================== */

.page-container {
  min-height: 100vh;
  background-color: var(--sb-bg);
  padding: 0 0 100px 0;
}

/* 1. Hero Section */
.hero-section {
  background: linear-gradient(180deg, #FFFFFF 0%, #FFF7F0 60%, var(--sb-bg) 100%);
  padding: 20px 16px 24px 16px;
  border-bottom-left-radius: 28px;
  border-bottom-right-radius: 28px;
}

.brand-bar {
  display: flex;
  align-items: center;
  margin-bottom: 20px;

  .brand-logo {
    width: 44px;
    height: 44px;
    border-radius: 12px;
    background: #fff;
    box-shadow: var(--sb-shadow-xs);
    margin-right: 12px;
  }

  .brand-text {
    display: flex;
    flex-direction: column;

    .brand-name {
      font-size: 17px;
      font-weight: 700;
      color: var(--sb-dark);
      letter-spacing: -0.2px;
    }

    .brand-slogan {
      font-size: 11px;
      font-weight: 500;
      color: var(--sb-primary);
      margin-top: 2px;
      letter-spacing: 0.5px;
    }
  }
}

.price-pill {
  display: inline-flex;
  align-items: center;
  background: #FFF0E6;
  border: 1px solid rgba(226, 107, 49, 0.25);
  padding: 6px 14px;
  border-radius: var(--sb-radius-full);
  margin-bottom: 16px;

  .pulse-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background-color: var(--sb-primary);
    margin-right: 8px;
  }

  .pill-text {
    font-size: 13px;
    font-weight: 600;
    color: var(--sb-primary);
  }
}

.hero-headline {
  margin-bottom: 12px;

  .headline-text {
    display: block;
    font-size: 26px;
    font-weight: 800;
    line-height: 1.25;
    color: var(--sb-dark);
  }

  .headline-highlight {
    display: block;
    font-size: 26px;
    font-weight: 800;
    line-height: 1.25;
    background: var(--sb-primary-gradient);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }
}

.hero-subtext {
  display: block;
  font-size: 13px;
  line-height: 1.6;
  color: var(--sb-text-sub);
  margin-bottom: 24px;
}

/* Trust Badges 2x2 Grid */
.trust-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.trust-badge {
  background: #FFFFFF;
  border-radius: var(--sb-radius-md);
  padding: 14px 12px;
  box-shadow: var(--sb-shadow-xs);
  border: 1px solid var(--sb-border);
  display: flex;
  flex-direction: column;

  .badge-icon {
    font-size: 20px;
    margin-bottom: 6px;
  }

  .badge-title {
    font-size: 13px;
    font-weight: 700;
    color: var(--sb-dark);
    margin-bottom: 2px;
  }

  .badge-sub {
    font-size: 11px;
    color: var(--sb-muted);
  }
}

/* Common Module Card */
.module-card {
  margin: 16px 14px;
  background: var(--sb-card-bg);
  border-radius: var(--sb-radius-lg);
  padding: 20px 16px;
  box-shadow: var(--sb-shadow-sm);
  border: 1px solid var(--sb-border);
}

.highlight-card {
  background: linear-gradient(180deg, #FFFFFF 0%, #FAFCFE 100%);
  border: 1px solid #DDF0FA;
}

.module-header {
  margin-bottom: 16px;

  .module-tag {
    display: inline-block;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: var(--sb-blue-dark);
    background: var(--sb-blue-soft);
    padding: 3px 8px;
    border-radius: 4px;
    margin-bottom: 6px;
  }

  .module-title {
    display: block;
    font-size: 18px;
    font-weight: 800;
    color: var(--sb-dark);
    letter-spacing: -0.3px;
  }

  .text-primary {
    color: var(--sb-primary);
  }

  .module-desc {
    display: block;
    font-size: 12px;
    color: var(--sb-muted);
    margin-top: 4px;
    line-height: 1.5;
  }
}

/* Pain Points List */
.pain-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.pain-card {
  background: #F9FAFB;
  border-radius: var(--sb-radius-md);
  padding: 14px;
  border: 1px solid #EEF2F6;

  .pain-top {
    display: flex;
    align-items: flex-start;
    margin-bottom: 10px;

    .pain-icon {
      font-size: 22px;
      margin-right: 10px;
      line-height: 1;
    }

    .pain-text {
      flex: 1;

      .pain-problem {
        display: block;
        font-size: 14px;
        font-weight: 700;
        color: var(--sb-dark);
        margin-bottom: 2px;
      }

      .pain-desc {
        display: block;
        font-size: 12px;
        color: var(--sb-text-sub);
        line-height: 1.4;
      }
    }
  }

  .solution-tag {
    display: flex;
    align-items: center;
    background: #FFF7ED;
    border-radius: 6px;
    padding: 6px 10px;
    border: 1px solid rgba(245, 166, 35, 0.25);

    .solution-icon {
      font-size: 13px;
      margin-right: 6px;
    }

    .solution-text {
      font-size: 12px;
      font-weight: 600;
      color: #C05621;
    }
  }
}

/* Comparison Box */
.compare-box {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.compare-item {
  border-radius: var(--sb-radius-md);
  padding: 14px;

  .compare-item-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;

    .compare-title {
      font-size: 14px;
      font-weight: 700;
    }

    .compare-status {
      font-size: 11px;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: var(--sb-radius-full);
    }
  }

  .timeline-bar {
    display: flex;
    height: 24px;
    border-radius: 6px;
    overflow: hidden;
    margin-bottom: 10px;

    .bar-seg {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;

      .seg-label {
        font-size: 10px;
        font-weight: 600;
        color: #fff;
        white-space: nowrap;
      }
    }

    .seg-gray { background: #94A3B8; }
    .seg-orange-light { background: #FB923C; }
    .seg-red { background: #EF4444; }
    .seg-warm { background: #FBBF24; }
    .seg-blue { background: #38BDF8; }
    .seg-green { background: #10B981; }
    .seg-purple { background: #818CF8; }
  }

  .compare-verdict {
    display: block;
    font-size: 12px;
    line-height: 1.5;
  }
}

.compare-bad {
  background: #FEF2F2;
  border: 1px solid #FEE2E2;

  .compare-title { color: #991B1B; }
  .status-bad { background: #FEE2E2; color: #DC2626; }
  .verdict-bad { color: #991B1B; }
}

.compare-good {
  background: #F0FDF4;
  border: 1px solid #DCFCE7;

  .compare-title { color: #166534; }
  .status-good { background: #DCFCE7; color: #15803D; }
  .verdict-good { color: #166534; font-weight: 500; }
}

/* Course Tabs & Cards */
.course-tabs {
  display: flex;
  background: #F1F5F9;
  border-radius: 12px;
  padding: 4px;
  margin-bottom: 16px;
}

.course-tab-item {
  flex: 1;
  text-align: center;
  padding: 10px 4px;
  border-radius: 10px;
  transition: all 0.2s ease;

  .tab-stage {
    display: block;
    font-size: 10px;
    font-weight: 700;
    color: var(--sb-muted);
    text-transform: uppercase;
  }

  .tab-name {
    display: block;
    font-size: 12px;
    font-weight: 600;
    color: var(--sb-text-sub);
    margin-top: 2px;
  }
}

.tab-active {
  background: #FFFFFF;
  box-shadow: var(--sb-shadow-xs);

  .tab-stage { color: var(--sb-primary); }
  .tab-name { color: var(--sb-dark); font-weight: 700; }
}

.course-detail-card {
  background: #FFFFFF;
  border: 1px solid var(--sb-border);
  border-radius: var(--sb-radius-md);
  padding: 16px;

  .course-detail-top {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 14px;

    .course-detail-title {
      display: block;
      font-size: 17px;
      font-weight: 800;
      color: var(--sb-dark);
    }

    .course-detail-age {
      display: block;
      font-size: 12px;
      color: var(--sb-primary);
      font-weight: 600;
      margin-top: 2px;
    }

    .course-price-badge {
      text-align: right;

      .price-num {
        font-size: 18px;
        font-weight: 800;
        color: var(--sb-primary);
      }

      .price-unit {
        font-size: 11px;
        color: var(--sb-muted);
      }
    }
  }

  .course-highlights-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    margin-bottom: 14px;

    .highlight-pill {
      display: flex;
      align-items: center;
      background: #F8FAFC;
      border-radius: 6px;
      padding: 6px 8px;

      .highlight-dot {
        font-size: 11px;
        color: var(--sb-primary);
        font-weight: bold;
        margin-right: 6px;
      }

      .highlight-text {
        font-size: 12px;
        color: var(--sb-text);
      }
    }
  }

  .course-target-box {
    background: #F8FAFC;
    border-left: 3px solid var(--sb-blue);
    padding: 8px 12px;
    border-radius: 0 6px 6px 0;
    margin-bottom: 16px;

    .target-label {
      font-size: 12px;
      font-weight: 700;
      color: var(--sb-dark);
    }

    .target-content {
      font-size: 12px;
      color: var(--sb-text-sub);
    }
  }

  .course-book-btn {
    background: #FFF7ED;
    border: 1px solid var(--sb-primary);
    border-radius: var(--sb-radius-full);
    text-align: center;
    padding: 10px 0;

    .book-btn-text {
      font-size: 13px;
      font-weight: 700;
      color: var(--sb-primary);
    }
  }
}

/* Teachers Showcase */
.teachers-grid {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.teacher-item {
  display: flex;
  background: #F8FAFC;
  border-radius: var(--sb-radius-md);
  padding: 14px;
  border: 1px solid #EDF2F7;

  .teacher-avatar {
    width: 72px;
    height: 72px;
    border-radius: var(--sb-radius-md);
    flex-shrink: 0;
    margin-right: 12px;
    background: #E2E8F0;
  }

  .teacher-info {
    flex: 1;

    .teacher-name-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 2px;

      .teacher-name {
        font-size: 15px;
        font-weight: 700;
        color: var(--sb-dark);
      }

      .teacher-cert {
        font-size: 10px;
        font-weight: 600;
        background: #DCFCE7;
        color: #15803D;
        padding: 2px 6px;
        border-radius: 4px;
      }
    }

    .teacher-exp {
      display: block;
      font-size: 11px;
      color: var(--sb-muted);
      margin-bottom: 6px;
    }

    .teacher-quote {
      display: block;
      font-size: 11px;
      color: var(--sb-text-sub);
      font-style: italic;
      line-height: 1.4;
      margin-bottom: 8px;
    }

    .teacher-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;

      .tag-pill {
        font-size: 10px;
        color: var(--sb-primary);
        background: #FFF0E6;
        padding: 2px 6px;
        border-radius: 4px;
      }
    }
  }
}

/* Parent Reviews */
.reviews-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.review-card {
  background: #F8FAFC;
  border-radius: var(--sb-radius-md);
  padding: 14px;
  border: 1px solid #EDF2F7;

  .stars {
    font-size: 12px;
    margin-bottom: 6px;
  }

  .review-content {
    display: block;
    font-size: 12px;
    line-height: 1.6;
    color: var(--sb-text);
    margin-bottom: 10px;
  }

  .review-author-row {
    display: flex;
    justify-content: space-between;
    align-items: center;

    .author-name {
      font-size: 12px;
      font-weight: 700;
      color: var(--sb-dark);
    }

    .author-tag {
      font-size: 11px;
      color: var(--sb-muted);
    }
  }
}

/* Floating Bottom Action Bar */
.bottom-bar-spacer {
  height: 84px;
}

.floating-action-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 74px;
  background: #FFFFFF;
  box-shadow: 0 -4px 20px rgba(11, 58, 83, 0.08);
  display: flex;
  align-items: center;
  padding: 0 16px;
  z-index: 999;
}

.action-advisor {
  margin-right: 12px;

  .advisor-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: transparent;
    padding: 0;
    margin: 0;
    line-height: 1.2;
    border: none;

    &::after {
      border: none;
    }

    .advisor-icon {
      font-size: 20px;
    }

    .advisor-label {
      font-size: 11px;
      font-weight: 600;
      color: var(--sb-text-sub);
      margin-top: 2px;
    }
  }
}

.action-main {
  flex: 1;

  .main-cta-btn {
    background: var(--sb-primary-gradient);
    box-shadow: var(--sb-shadow-primary);
    border-radius: var(--sb-radius-full);
    height: 50px;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 16px;

    .cta-icon {
      font-size: 20px;
      margin-right: 8px;
    }

    .cta-text-group {
      display: flex;
      flex-direction: column;

      .cta-primary-title {
        font-size: 15px;
        font-weight: 800;
        color: #FFFFFF;
        line-height: 1.2;
      }

      .cta-subtitle {
        font-size: 10px;
        color: rgba(255, 255, 255, 0.85);
        line-height: 1.2;
        margin-top: 2px;
      }
    }
  }
}
'''

with open('src/pages/index/index.scss', 'w', encoding='utf-8') as f:
    f.write(scss_content)
print('Updated index.scss successfully!')
