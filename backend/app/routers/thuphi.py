from datetime import date, datetime

from fastapi import APIRouter, Depends, File, HTTPException, Query, Response, UploadFile, status
from sqlalchemy import func, inspect, text
from sqlalchemy.orm import Session
from ..core.db import get_db
from ..core.dependencies import require_roles
from ..models.hogiadinh import HoGiaDinh
from ..models.payment import Payment
from ..models.nhankhau import NhanKhau
from ..models.thuphi import ThuPhi
from ..schemas.payment import PaymentCreate, PaymentOut, PaymentUpdate
from ..schemas.thuphi import ThuPhiCreate, ThuPhiOut, ThuPhiUpdate
from ..services.excel_service import create_excel_file, read_excel_file

router = APIRouter(prefix="/thuphi", tags=["thuphi"])

COLLECTION_TYPE_MAP = {
    "bat_buoc_ca_nhan": "bat_buoc_ca_nhan",
    "bắt buộc cá nhân": "bat_buoc_ca_nhan",
    "bat buoc ca nhan": "bat_buoc_ca_nhan",
    "bat_buoc_theo_ho": "bat_buoc_theo_ho",
    "bắt buộc theo hộ": "bat_buoc_theo_ho",
    "bat buoc theo ho": "bat_buoc_theo_ho",
    "bat_buoc_theo_danh_sach": "bat_buoc_theo_danh_sach",
    "bắt buộc theo danh sách": "bat_buoc_theo_danh_sach",
    "bat buoc theo danh sach": "bat_buoc_theo_danh_sach",
    "tu_nguyen": "tu_nguyen",
    "tự nguyện": "tu_nguyen",
    "tu nguyen": "tu_nguyen",
    "none": "none",
    "không xác định": "none",
    "khong xac dinh": "none",
    "": "none",
}

MANDATORY_TYPES = {"bat_buoc_ca_nhan", "bat_buoc_theo_ho", "bat_buoc_theo_danh_sach"}


def normalize_collection_type(value: str | None) -> str:
    if not value:
        return "none"
    return COLLECTION_TYPE_MAP.get(value.strip().lower(), "none")


def ensure_amount_rule(collection_type: str, amount: float | None) -> None:
    if collection_type in MANDATORY_TYPES and amount is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Khoản thu bắt buộc phải có số tiền cụ thể.",
        )


def _normalize_target_codes(raw: object) -> list[str]:
    if raw is None:
        return []
    if isinstance(raw, list):
        iterable = raw
    elif isinstance(raw, str):
        iterable = raw.replace(",", "\n").splitlines()
    else:
        iterable = [str(raw)]
    cleaned: list[str] = []
    for item in iterable:
        if not isinstance(item, str):
            continue
        code = item.strip()
        if code:
            cleaned.append(code)
    return cleaned


def _prepare_fee_output(fee: ThuPhi) -> ThuPhiOut:
    if not fee.collection_type:
        fee.collection_type = "none"
    if fee.collection_type != "bat_buoc_theo_danh_sach":
        fee.target_codes = None
    return ThuPhiOut.model_validate(fee)


def _build_obligations_response(collection_type: str) -> dict[str, list[dict[str, object]]]:
    return {"collection_type": collection_type, "paid": [], "unpaid": []}


def _ensure_fee_schema(db: Session) -> None:
    """Ensure legacy databases have the new fee columns."""
    engine = db.get_bind()
    inspector = inspect(engine)
    columns = {col["name"]: col for col in inspector.get_columns("thuphi")}
    changed = False

    if "collection_type" not in columns:
        db.execute(
            text(
                "ALTER TABLE thuphi ADD COLUMN collection_type VARCHAR(50) DEFAULT 'none'"
            )
        )
        db.execute(text("UPDATE thuphi SET collection_type = 'none' WHERE collection_type IS NULL"))
        db.execute(text("ALTER TABLE thuphi ALTER COLUMN collection_type DROP DEFAULT"))
        db.execute(text("ALTER TABLE thuphi ALTER COLUMN collection_type SET NOT NULL"))
        changed = True

    if "target_codes" not in columns:
        db.execute(text("ALTER TABLE thuphi ADD COLUMN target_codes JSONB"))
        changed = True

    amount_info = columns.get("amount")
    if amount_info is not None and not amount_info.get("nullable", False):
        db.execute(text("ALTER TABLE thuphi ALTER COLUMN amount DROP NOT NULL"))
        changed = True

    if changed:
        db.commit()


@router.get("/", response_model=list[ThuPhiOut])
def list_fees(
    db: Session = Depends(get_db),
    keyword: str | None = Query(default=None, description="Search fee by name"),
) -> list[ThuPhiOut]:
    _ensure_fee_schema(db)
    query = db.query(ThuPhi)
    if keyword:
        like = f"%{keyword}%"
        query = query.filter(ThuPhi.name.ilike(like))
    fees = query.order_by(ThuPhi.created_at.desc()).all()
    return [_prepare_fee_output(fee) for fee in fees]


@router.post("/", response_model=ThuPhiOut, status_code=status.HTTP_201_CREATED)
def create_fee(
    data: ThuPhiCreate,
    db: Session = Depends(get_db),
    _: object = Depends(require_roles("admin", "ke_toan")),
) -> ThuPhiOut:
    _ensure_fee_schema(db)
    payload = data.model_dump()
    collection_type = normalize_collection_type(payload.get("collection_type"))
    payload["collection_type"] = collection_type
    ensure_amount_rule(collection_type, payload.get("amount"))
    codes = _normalize_target_codes(payload.get("target_codes"))
    if collection_type == "bat_buoc_theo_danh_sach":
        if not codes:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Vui lòng nhập danh sách mã nhân khẩu.")
        payload["target_codes"] = codes
    else:
        payload["target_codes"] = None
    fee = ThuPhi(**payload)
    db.add(fee)
    db.commit()
    db.refresh(fee)
    return _prepare_fee_output(fee)


@router.get("/{fee_id}", response_model=ThuPhiOut)
def get_fee(fee_id: int, db: Session = Depends(get_db)) -> ThuPhiOut:
    _ensure_fee_schema(db)
    fee = db.query(ThuPhi).filter(ThuPhi.id == fee_id).first()
    if fee is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Fee not found")
    return _prepare_fee_output(fee)


@router.put("/{fee_id}", response_model=ThuPhiOut)
def update_fee(
    fee_id: int,
    data: ThuPhiUpdate,
    db: Session = Depends(get_db),
    _: object = Depends(require_roles("admin", "ke_toan")),
) -> ThuPhiOut:
    _ensure_fee_schema(db)
    fee = db.query(ThuPhi).filter(ThuPhi.id == fee_id).first()
    if fee is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Fee not found")
    update_data = data.model_dump(exclude_unset=True)
    if update_data:
        collection_type = normalize_collection_type(update_data.get("collection_type", fee.collection_type))
        ensure_amount_rule(collection_type, update_data.get("amount", fee.amount))
        update_data["collection_type"] = collection_type
        if collection_type == "bat_buoc_theo_danh_sach":
            codes = _normalize_target_codes(update_data.get("target_codes", fee.target_codes))
            if not codes:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Vui lòng nhập danh sách mã nhân khẩu.")
            update_data["target_codes"] = codes
        else:
            update_data["target_codes"] = None
        for key, value in update_data.items():
            setattr(fee, key, value)
    db.commit()
    db.refresh(fee)
    return _prepare_fee_output(fee)


@router.delete("/{fee_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_fee(
    fee_id: int,
    db: Session = Depends(get_db),
    _: object = Depends(require_roles("admin", "ke_toan")),
) -> None:
    _ensure_fee_schema(db)
    fee = db.query(ThuPhi).filter(ThuPhi.id == fee_id).first()
    if fee is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Fee not found")
    db.delete(fee)
    db.commit()


@router.post("/{fee_id}/payments", response_model=PaymentOut, status_code=status.HTTP_201_CREATED)
def record_payment(
    fee_id: int,
    data: PaymentCreate,
    db: Session = Depends(get_db),
    _: object = Depends(require_roles("admin", "ke_toan")),
) -> PaymentOut:
    _ensure_fee_schema(db)
    fee = db.query(ThuPhi).filter(ThuPhi.id == fee_id).first()
    if fee is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Fee not found")
    
    household = db.query(HoGiaDinh).filter(HoGiaDinh.household_code == data.household_code).first()
    if household is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Household code does not exist")
    
    if data.citizen_id is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Citizen is required")
    
    citizen = db.query(NhanKhau).filter(NhanKhau.id == data.citizen_id).first()
    if citizen is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Citizen not found")
    if citizen.household_id != household.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Citizen does not belong to the selected household")
    
    payment = Payment(
        citizen_id=citizen.id,
        citizen_name=citizen.full_name,
        household_code=household.household_code,
        amount_paid=data.amount_paid,
        fee_id=fee_id,
    )
    if data.payment_date:
        payment.payment_date = data.payment_date
    db.add(payment)
    db.commit()
    db.refresh(payment)
    return PaymentOut.model_validate(payment)


@router.get("/{fee_id}/payments", response_model=list[PaymentOut])
def list_payments(fee_id: int, db: Session = Depends(get_db)) -> list[PaymentOut]:
    _ensure_fee_schema(db)
    payments = db.query(Payment).filter(Payment.fee_id == fee_id).order_by(Payment.payment_date.desc()).all()
    return [PaymentOut.model_validate(payment) for payment in payments]


@router.put("/{fee_id}/payments/{payment_id}", response_model=PaymentOut)
def update_payment(
    fee_id: int,
    payment_id: int,
    data: PaymentUpdate,
    db: Session = Depends(get_db),
    _: object = Depends(require_roles("admin", "ke_toan")),
) -> PaymentOut:
    _ensure_fee_schema(db)
    fee = db.query(ThuPhi).filter(ThuPhi.id == fee_id).first()
    if fee is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Fee not found")

    payment = db.query(Payment).filter(Payment.id == payment_id, Payment.fee_id == fee_id).first()
    if payment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment not found")

    update_data = data.model_dump(exclude_unset=True)

    household_code = update_data.get("household_code")
    if household_code:
        household = db.query(HoGiaDinh).filter(HoGiaDinh.household_code == household_code).first()
        if household is None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Household code does not exist")
    else:
        household = None

    citizen_id = update_data.get("citizen_id")
    if citizen_id is not None:
        citizen = db.query(NhanKhau).filter(NhanKhau.id == citizen_id).first()
        if citizen is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Citizen not found")
        if household and citizen.household_code != household.household_code:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Citizen does not belong to the selected household")
        payment.citizen_id = citizen.id
        payment.citizen_name = citizen.full_name
        payment.household_code = citizen.household_code

    if "citizen_name" in update_data and citizen_id is None:
        payment.citizen_name = update_data["citizen_name"] or payment.citizen_name

    if household_code is not None and citizen_id is None:
        if household_code == "":
            payment.household_code = None
        else:
            payment.household_code = household_code

    if "amount_paid" in update_data and update_data["amount_paid"] is not None:
        payment.amount_paid = update_data["amount_paid"]
    
    if "payment_date" in update_data and update_data["payment_date"] is not None:
        payment.payment_date = update_data["payment_date"]

    db.commit()
    db.refresh(payment)
    return PaymentOut.model_validate(payment)


@router.delete("/{fee_id}/payments/{payment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_payment(
    fee_id: int,
    payment_id: int,
    db: Session = Depends(get_db),
    _: object = Depends(require_roles("admin", "ke_toan")),
) -> None:
    _ensure_fee_schema(db)
    payment = db.query(Payment).filter(Payment.id == payment_id, Payment.fee_id == fee_id).first()
    if payment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment not found")
    db.delete(payment)
    db.commit()


@router.get("/stats/summary")
def fee_statistics(db: Session = Depends(get_db)) -> dict[str, float]:
    _ensure_fee_schema(db)
    total_fees = db.query(func.sum(ThuPhi.amount)).scalar() or 0
    total_collected = db.query(func.sum(Payment.amount_paid)).scalar() or 0
    return {
        "expected_total": float(total_fees),
        "collected_total": float(total_collected),
        "outstanding": float(total_fees - total_collected),
    }


@router.get("/stats/dashboard")
def dashboard_statistics(
    db: Session = Depends(get_db),
    start_date: str | None = Query(default=None),
    end_date: str | None = Query(default=None),
    fee_id: int | None = Query(default=None),
) -> dict:
    """Get comprehensive dashboard statistics"""
    _ensure_fee_schema(db)
    
    from datetime import datetime as dt
    from sqlalchemy import and_, case, distinct
    
    # Parse dates
    start_dt = dt.fromisoformat(start_date) if start_date else None
    end_dt = dt.fromisoformat(end_date) if end_date else None
    
    # Build payment query with filters
    payment_query = db.query(Payment)
    if start_dt:
        payment_query = payment_query.filter(Payment.payment_date >= start_dt)
    if end_dt:
        payment_query = payment_query.filter(Payment.payment_date <= end_dt)
    if fee_id:
        payment_query = payment_query.filter(Payment.fee_id == fee_id)
    
    # Calculate totals
    total_collected = payment_query.with_entities(func.sum(Payment.amount_paid)).scalar() or 0
    
    # Get fee statistics with collected amounts
    fee_query = db.query(
        ThuPhi.id,
        ThuPhi.name,
        ThuPhi.amount,
        ThuPhi.collection_type,
        func.coalesce(func.sum(Payment.amount_paid), 0).label("collected")
    ).outerjoin(Payment, Payment.fee_id == ThuPhi.id)
    
    if start_dt or end_dt:
        fee_query = fee_query.filter(
            and_(
                Payment.payment_date >= start_dt if start_dt else True,
                Payment.payment_date <= end_dt if end_dt else True
            ) if Payment.id != None else True
        )
    
    if fee_id:
        fee_query = fee_query.filter(ThuPhi.id == fee_id)
    
    fee_stats = fee_query.group_by(ThuPhi.id, ThuPhi.name, ThuPhi.amount, ThuPhi.collection_type).all()
    
    fees_list = []
    total_expected = 0
    for fee in fee_stats:
        expected = float(fee.amount or 0)
        collected = float(fee.collected or 0)
        remaining = max(0, expected - collected)
        completion = (collected / expected * 100) if expected > 0 else 0
        
        total_expected += expected
        
        fees_list.append({
            "id": fee.id,
            "name": fee.name,
            "expected": expected,
            "collected": collected,
            "remaining": remaining,
            "completion_rate": round(completion, 2)
        })
    
    # Get top debtors by household
    debtor_query = db.query(
        HoGiaDinh.household_code,
        HoGiaDinh.head_of_household,
        func.count(distinct(ThuPhi.id)).label("fee_count"),
        func.sum(ThuPhi.amount).label("total_expected"),
        func.coalesce(func.sum(Payment.amount_paid), 0).label("total_paid")
    ).outerjoin(
        NhanKhau, NhanKhau.household_id == HoGiaDinh.id
    ).outerjoin(
        Payment, Payment.citizen_id == NhanKhau.id
    ).outerjoin(
        ThuPhi, ThuPhi.id == Payment.fee_id
    )
    
    if fee_id:
        debtor_query = debtor_query.filter(ThuPhi.id == fee_id)
    
    debtors = debtor_query.group_by(
        HoGiaDinh.id, HoGiaDinh.household_code, HoGiaDinh.head_of_household
    ).having(
        func.sum(ThuPhi.amount) > func.coalesce(func.sum(Payment.amount_paid), 0)
    ).order_by(
        (func.sum(ThuPhi.amount) - func.coalesce(func.sum(Payment.amount_paid), 0)).desc()
    ).limit(10).all()
    
    top_debtors = []
    for debtor in debtors:
        expected = float(debtor.total_expected or 0)
        paid = float(debtor.total_paid or 0)
        remaining = expected - paid
        top_debtors.append({
            "household_code": debtor.household_code,
            "head_of_household": debtor.head_of_household,
            "fee_count": debtor.fee_count,
            "expected": expected,
            "paid": paid,
            "remaining": remaining
        })
    
    # Overall completion rate
    total_outstanding = max(0, total_expected - total_collected)
    completion_rate = (total_collected / total_expected * 100) if total_expected > 0 else 0
    
    return {
        "total_expected": float(total_expected),
        "total_collected": float(total_collected),
        "total_outstanding": float(total_outstanding),
        "completion_rate": round(completion_rate, 2),
        "fees": sorted(fees_list, key=lambda x: x["completion_rate"]),
        "top_debtors": top_debtors
    }


@router.post("/import", status_code=status.HTTP_200_OK)
def import_fees(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _: object = Depends(require_roles("admin", "ke_toan")),
) -> dict[str, int]:
    _ensure_fee_schema(db)
    """Import fees from Excel file."""
    if not file.filename.endswith((".xlsx", ".xls")):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File must be Excel format (.xlsx or .xls)")
    
    content = file.file.read()
    data = read_excel_file(content)
    
    imported = 0
    errors = 0
    
    for row in data:
        try:
            name = str(row.get("name", "")).strip()
            if not name:
                errors += 1
                continue
            
            collection_type = normalize_collection_type(row.get("collection_type") or row.get("Loại thu phí"))
            target_codes_raw = row.get("target_codes") or row.get("Danh sách bắt buộc")
            codes = _normalize_target_codes(target_codes_raw)
            amount_raw = row.get("amount")
            amount: float | None
            if amount_raw in (None, ""):
                amount = None
            else:
                try:
                    amount = float(amount_raw)
                except (TypeError, ValueError):
                    errors += 1
                    continue
                if amount < 0:
                    errors += 1
                    continue

            try:
                ensure_amount_rule(collection_type, amount)
            except HTTPException:
                errors += 1
                continue
            if collection_type == "bat_buoc_theo_danh_sach" and not codes:
                errors += 1
                continue
            
            # Parse date if provided
            def parse_date(value):
                if not value:
                    return None
                if isinstance(value, str):
                    try:
                        return datetime.fromisoformat(value.split("T")[0]).date()
                    except ValueError:
                        return None
                if isinstance(value, datetime):
                    return value.date()
                if isinstance(value, date):
                    return value
                return None

            start_date_raw = row.get("start_date")
            due_date_raw = row.get("due_date")
            start_date = parse_date(start_date_raw)
            due_date = parse_date(due_date_raw)

            if (start_date_raw and start_date is None) or (due_date_raw and due_date is None):
                errors += 1
                continue

            fee = ThuPhi(
                name=name,
                description=str(row.get("description", "")).strip() if row.get("description") else None,
                amount=amount,
                collection_type=collection_type,
                target_codes=codes if collection_type == "bat_buoc_theo_danh_sach" else None,
                start_date=start_date,
                due_date=due_date,
            )
            db.add(fee)
            imported += 1
        except Exception:
            errors += 1
            continue
    
    db.commit()
    return {"imported": imported, "errors": errors}


@router.get("/export/excel")
def export_fees(
    db: Session = Depends(get_db),
    _: object = Depends(require_roles("admin", "ke_toan")),
) -> Response:
    _ensure_fee_schema(db)
    """Export fees to Excel file."""
    fees = db.query(ThuPhi).order_by(ThuPhi.created_at.desc()).all()
    
    headers = ["name", "description", "amount", "collection_type", "target_codes", "start_date", "due_date", "created_at"]
    data = [
        {
            "name": f.name,
            "description": f.description or "",
            "amount": f.amount,
            "collection_type": f.collection_type or "none",
            "target_codes": "\n".join(f.target_codes) if f.target_codes else "",
            "start_date": f.start_date.isoformat() if f.start_date else "",
            "due_date": f.due_date.isoformat() if f.due_date else "",
            "created_at": f.created_at.isoformat() if f.created_at else "",
        }
        for f in fees
    ]
    
    excel_file = create_excel_file(headers, data)
    
    return Response(
        content=excel_file.getvalue(),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=fees.xlsx"},
    )


@router.get("/{fee_id}/payments/export")
def export_payments(
    fee_id: int,
    db: Session = Depends(get_db),
    _: object = Depends(require_roles("admin", "ke_toan")),
) -> Response:
    _ensure_fee_schema(db)
    """Export payments for a specific fee to Excel file."""
    fee = db.query(ThuPhi).filter(ThuPhi.id == fee_id).first()
    if fee is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Fee not found")
    
    payments = db.query(Payment).filter(Payment.fee_id == fee_id).order_by(Payment.payment_date.desc()).all()
    
    headers = ["citizen_name", "household_code", "amount_paid", "payment_date"]
    data = [
        {
            "citizen_name": p.citizen_name,
            "household_code": p.household_code or "",
            "amount_paid": p.amount_paid,
            "payment_date": p.payment_date.isoformat() if p.payment_date else "",
        }
        for p in payments
    ]
    
    excel_file = create_excel_file(headers, data)
    
    return Response(
        content=excel_file.getvalue(),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename=payments_{fee_id}.xlsx"},
    )


def _get_fee_obligations(fee: ThuPhi, db: Session) -> dict[str, list[dict[str, object]]]:
    collection_type = fee.collection_type or "none"
    result = _build_obligations_response(collection_type)
    if collection_type not in MANDATORY_TYPES:
        return result

    payments = db.query(Payment).filter(Payment.fee_id == fee.id).all()

    if collection_type == "bat_buoc_ca_nhan":
        citizens = db.query(NhanKhau).all()
        citizen_map = {c.id: c for c in citizens}
        paid_map: dict[int, dict[str, object]] = {}
        for payment in payments:
            if payment.citizen_id and payment.citizen_id in citizen_map:
                citizen = citizen_map[payment.citizen_id]
                entry = paid_map.setdefault(
                    payment.citizen_id,
                    {
                        "code": citizen.citizen_code,
                        "name": citizen.full_name,
                        "paid_amount": 0.0,
                    },
                )
                entry["paid_amount"] = float(entry["paid_amount"]) + payment.amount_paid
        result["paid"] = list(paid_map.values())
        result["unpaid"] = [
            {"code": citizen.citizen_code, "name": citizen.full_name}
            for citizen_id, citizen in citizen_map.items()
            if citizen_id not in paid_map
        ]
        return result

    if collection_type == "bat_buoc_theo_ho":
        households = db.query(HoGiaDinh).all()
        household_map = {h.household_code: h for h in households if h.household_code}
        paid_map: dict[str, dict[str, object]] = {}
        for payment in payments:
            code = payment.household_code
            if not code or code not in household_map:
                continue
            household = household_map[code]
            entry = paid_map.setdefault(
                code,
                {
                    "code": household.household_code,
                    "name": household.head_of_household,
                    "paid_amount": 0.0,
                },
            )
            entry["paid_amount"] = float(entry["paid_amount"]) + payment.amount_paid
        result["paid"] = list(paid_map.values())
        result["unpaid"] = [
            {"code": h.household_code, "name": h.head_of_household}
            for code, h in household_map.items()
            if code not in paid_map
        ]
        return result

    if collection_type == "bat_buoc_theo_danh_sach":
        target_codes = fee.target_codes or []
        if not target_codes:
            return result
        citizens = (
            db.query(NhanKhau)
            .filter(NhanKhau.citizen_code.in_(target_codes))
            .all()
        )
        citizen_by_code = {c.citizen_code: c for c in citizens}
        citizen_by_id = {c.id: c for c in citizens}
        paid_map: dict[str, dict[str, object]] = {}
        for payment in payments:
            citizen = citizen_by_id.get(payment.citizen_id or 0)
            if not citizen:
                continue
            code = citizen.citizen_code
            if code not in target_codes:
                continue
            entry = paid_map.setdefault(
                code,
                {
                    "code": code,
                    "name": citizen.full_name,
                    "paid_amount": 0.0,
                },
            )
            entry["paid_amount"] = float(entry["paid_amount"]) + payment.amount_paid
        result["paid"] = list(paid_map.values())
        unpaid_entries: list[dict[str, object]] = []
        for code in target_codes:
            if code in paid_map:
                continue
            citizen = citizen_by_code.get(code)
            name = citizen.full_name if citizen else "Không tìm thấy"
            unpaid_entries.append({"code": code, "name": name})
        result["unpaid"] = unpaid_entries
        return result

    return result


@router.get("/{fee_id}/obligations")
def fee_obligations(
    fee_id: int,
    db: Session = Depends(get_db),
    _: object = Depends(require_roles("admin", "ke_toan")),
) -> dict[str, list[dict[str, object]]]:
    _ensure_fee_schema(db)
    fee = db.query(ThuPhi).filter(ThuPhi.id == fee_id).first()
    if fee is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Fee not found")
    return _get_fee_obligations(fee, db)


@router.post("/{fee_id}/payments/import", status_code=status.HTTP_200_OK)
def import_payments(
    fee_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _: object = Depends(require_roles("admin", "ke_toan")),
) -> dict[str, int]:
    _ensure_fee_schema(db)
    """Import payments for a specific fee from Excel file."""
    fee = db.query(ThuPhi).filter(ThuPhi.id == fee_id).first()
    if fee is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Fee not found")

    if not file.filename.endswith((".xlsx", ".xls")):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File must be Excel format (.xlsx or .xls)")

    def parse_payment_date(value: object) -> datetime | None:
        if not value:
            return None
        if isinstance(value, datetime):
            return value
        if isinstance(value, date):
            return datetime.combine(value, datetime.min.time())
        if isinstance(value, str):
            try:
                return datetime.fromisoformat(value.split("Z")[0])
            except ValueError:
                return None
        return None

    content = file.file.read()
    rows = read_excel_file(content)
    imported = 0
    errors = 0

    for row in rows:
        try:
            household_code = str(row.get("household_code", "")).strip()
            citizen_id_raw = row.get("citizen_id")
            amount_paid_raw = row.get("amount_paid")
            if not household_code or citizen_id_raw in (None, "") or amount_paid_raw in (None, ""):
                errors += 1
                continue

            household = db.query(HoGiaDinh).filter(HoGiaDinh.household_code == household_code).first()
            if household is None:
                errors += 1
                continue

            citizen_id = int(float(citizen_id_raw))
            citizen = db.query(NhanKhau).filter(NhanKhau.id == citizen_id).first()
            if citizen is None or citizen.household_id != household.id:
                errors += 1
                continue

            amount_paid = float(amount_paid_raw)
            if amount_paid <= 0:
                errors += 1
                continue

            payment_date = parse_payment_date(row.get("payment_date"))

            payment = Payment(
                citizen_id=citizen.id,
                citizen_name=citizen.full_name,
                household_code=household.household_code,
                amount_paid=amount_paid,
                fee_id=fee_id,
            )
            if payment_date:
                payment.payment_date = payment_date

            db.add(payment)
            imported += 1
        except Exception:
            errors += 1
            continue

    db.commit()
    return {"imported": imported, "errors": errors}
