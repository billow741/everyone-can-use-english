import os

scss = '''/* ==========================================================================
   SunnyBridge Apply Page Styles
   Agency UI Design: High-Trust, Seamless Form Experience
   ========================================================================== */

.apply-container {
  min-height: 100vh;
  background-color: var(--sb-bg);
  padding: 16px 14px 40px 14px;
}

/* 1. Apply Header Banner */
.apply-header {
  background: linear-gradient(135deg, #FFF0E6 0%, #FFE4D4 100%);
  border-radius: var(--sb-radius-lg);
  padding: 22px 18px;
  margin-bottom: 16px;
  border: 1px solid rgba(226, 107, 49, 0.15);
  box-shadow: var(--sb-shadow-xs);

  .header-badge {
    display: inline-flex;
    align-items: center;
    background: #FFFFFF;
    padding: 4px 10px;
    border-radius: var(--sb-radius-full);
    margin-bottom: 10px;

    .badge-sparkle {
      font-size: 13px;
      margin-right: 4px;
    }

    .badge-text {
      font-size: 11px;
      font-weight: 700;
      color: var(--sb-primary);
    }
  }

  .header-title {
    display: block;
    font-size: 20px;
    font-weight: 800;
    color: var(--sb-dark);
    margin-bottom: 6px;
    letter-spacing: -0.3px;
  }

  .header-subtitle {
    display: block;
    font-size: 12px;
    color: var(--sb-text-sub);
    line-height: 1.5;
    margin-bottom: 14px;
  }

  .guarantee-row {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    border-top: 1px dashed rgba(226, 107, 49, 0.25);
    padding-top: 10px;

    .guarantee-item {
      font-size: 11px;
      font-weight: 600;
      color: var(--sb-primary);
    }
  }
}

/* 2. Form Card */
.form-card {
  background: var(--sb-card-bg);
  border-radius: var(--sb-radius-lg);
  padding: 22px 18px;
  box-shadow: var(--sb-shadow-sm);
  border: 1px solid var(--sb-border);
  margin-bottom: 16px;
}

.form-field {
  margin-bottom: 18px;

  .field-label {
    display: block;
    font-size: 13px;
    font-weight: 700;
    color: var(--sb-dark);
    margin-bottom: 8px;

    .required {
      color: var(--sb-primary);
    }
  }

  .field-input {
    width: 100%;
    height: 44px;
    background: #F8FAFC;
    border: 1px solid #E2E8F0;
    border-radius: var(--sb-radius-sm);
    padding: 0 14px;
    font-size: 13px;
    color: var(--sb-text);
  }

  .field-textarea {
    width: 100%;
    height: 80px;
    background: #F8FAFC;
    border: 1px solid #E2E8F0;
    border-radius: var(--sb-radius-sm);
    padding: 10px 14px;
    font-size: 13px;
    color: var(--sb-text);
    line-height: 1.4;
  }

  .placeholder {
    color: var(--sb-muted);
    font-size: 12px;
  }
}

/* Course Chips */
.course-chips {
  display: flex;
  flex-direction: column;
  gap: 8px;

  .course-chip {
    background: #F8FAFC;
    border: 1px solid #E2E8F0;
    border-radius: var(--sb-radius-sm);
    padding: 10px 12px;
    transition: all 0.2s ease;

    .chip-text {
      font-size: 12px;
      font-weight: 600;
      color: var(--sb-text-sub);
    }
  }

  .chip-active {
    background: #FFF7ED;
    border-color: var(--sb-primary);

    .chip-text {
      color: var(--sb-primary);
      font-weight: 700;
    }
  }
}

/* Phone input with one-click authorization */
.phone-row {
  display: flex;
  gap: 8px;

  .phone-input {
    flex: 1;
  }

  .wechat-phone-btn {
    background: #DCFCE7;
    color: #15803D;
    font-size: 12px;
    font-weight: 700;
    border-radius: var(--sb-radius-sm);
    border: 1px solid #BBF7D0;
    height: 44px;
    line-height: 44px;
    padding: 0 12px;
    white-space: nowrap;
    margin: 0;

    &::after {
      border: none;
    }
  }
}

/* Submit Button */
.submit-btn-wrap {
  margin-top: 26px;

  .submit-btn {
    background: var(--sb-primary-gradient);
    box-shadow: var(--sb-shadow-primary);
    border-radius: var(--sb-radius-full);
    height: 50px;
    display: flex;
    align-items: center;
    justify-content: center;

    .submit-text {
      font-size: 16px;
      font-weight: 800;
      color: #FFFFFF;
      letter-spacing: 0.5px;
    }
  }

  .btn-disabled {
    opacity: 0.6;
  }
}

.privacy-tip {
  display: block;
  text-align: center;
  font-size: 11px;
  color: var(--sb-muted);
  margin-top: 12px;
}

/* 3. Advisor Contact Card */
.advisor-card {
  background: var(--sb-card-bg);
  border-radius: var(--sb-radius-lg);
  padding: 16px;
  box-shadow: var(--sb-shadow-sm);
  border: 1px solid var(--sb-border);
  display: flex;
  align-items: center;
  justify-content: space-between;

  .advisor-left {
    display: flex;
    align-items: center;
    flex: 1;
    margin-right: 12px;

    .advisor-avatar {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      margin-right: 10px;
      flex-shrink: 0;
    }

    .advisor-info {
      .advisor-title-row {
        display: flex;
        align-items: center;
        margin-bottom: 2px;

        .advisor-title {
          font-size: 13px;
          font-weight: 700;
          color: var(--sb-dark);
        }

        .advisor-tag {
          font-size: 9px;
          background: #DCFCE7;
          color: #15803D;
          padding: 1px 5px;
          border-radius: 4px;
          margin-left: 6px;
          font-weight: 600;
        }
      }

      .advisor-desc {
        font-size: 11px;
        color: var(--sb-text-sub);
        line-height: 1.3;
      }
    }
  }

  .advisor-action-btn {
    background: #F0F7FC;
    color: var(--sb-blue-dark);
    font-size: 12px;
    font-weight: 700;
    border-radius: var(--sb-radius-full);
    border: 1px solid #C7EAF0;
    height: 34px;
    line-height: 34px;
    padding: 0 14px;
    margin: 0;
    white-space: nowrap;

    &::after {
      border: none;
    }
  }
}
'''

with open('src/pages/apply/index.scss', 'w', encoding='utf-8') as f:
    f.write(scss)
print('Updated apply/index.scss successfully!')
