from datetime import date, datetime

from fastapi import APIRouter, Depends, File, HTTPException, Query, Response, UploadFile, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from datetime import date, datetime
from ..core.db import get_db
from ..core.dependencies import require_roles
from ..models.payment import Payment
from ..models.nhankhau import NhanKhau
from ..models.thuphi import ThuPhi
from ..schemas.payment import PaymentCreate, PaymentOut, PaymentUpdate
from ..schemas.thuphi import ThuPhiCreate, ThuPhiOut, ThuPhiUpdate
from ..services.excel_service import create_excel_file, read_excel_file

router = APIRouter(prefix="/thuphi", tags=["thuphi"])


@router.get("/", response_model=list[ThuPhiOut])
def list_fees(
    db: Session = Depends(get_db),
    keyword: str | None = Query(default=None, description="Search fee by name"),
) -> list[ThuPhiOut]:
    query = db.query(ThuPhi)
    if keyword:
        like = f"%{keyword}%"
        query = query.filter(ThuPhi.name.ilike(like))
    fees = query.order_by(ThuPhi.created_at.desc()).all()
    return [ThuPhiOut.model_validate(fee) for fee in fees]


@router.post("/", response_model=ThuPhiOut, status_code=status.HTTP_201_CREATED)
def create_fee(
    data: ThuPhiCreate,
    db: Session = Depends(get_db),
    _: object = Depends(require_roles("admin", "ke_toan")),
) -> ThuPhiOut:
    fee = ThuPhi(**data.model_dump())
    db.add(fee)
    db.commit()
    db.refresh(fee)
    return ThuPhiOut.model_validate(fee)


@router.get("/{fee_id}", response_model=ThuPhiOut)
def get_fee(fee_id: int, db: Session = Depends(get_db)) -> ThuPhiOut:
    fee = db.query(ThuPhi).filter(ThuPhi.id == fee_id).first()
    if fee is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Fee not found")
    return ThuPhiOut.model_validate(fee)


@router.put("/{fee_id}", response_model=ThuPhiOut)
def update_fee(
    fee_id: int,
    data: ThuPhiUpdate,
    db: Session = Depends(get_db),
    _: object = Depends(require_roles("admin", "ke_toan")),
) -> ThuPhiOut:
    fee = db.query(ThuPhi).filter(ThuPhi.id == fee_id).first()
    if fee is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Fee not found")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(fee, key, value)
    db.commit()
    db.refresh(fee)
    return ThuPhiOut.model_validate(fee)


@router.delete("/{fee_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_fee(
    fee_id: int,
    db: Session = Depends(get_db),
    _: object = Depends(require_roles("admin", "ke_toan")),
) -> None:
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
    from ..models.hogiadinh import HoGiaDinh
    
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
    db.add(payment)
    db.commit()
    db.refresh(payment)
    return PaymentOut.model_validate(payment)


@router.get("/{fee_id}/payments", response_model=list[PaymentOut])
def list_payments(fee_id: int, db: Session = Depends(get_db)) -> list[PaymentOut]:
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
    from ..models.hogiadinh import HoGiaDinh

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
    payment = db.query(Payment).filter(Payment.id == payment_id, Payment.fee_id == fee_id).first()
    if payment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment not found")
    db.delete(payment)
    db.commit()


@router.get("/stats/summary")
def fee_statistics(db: Session = Depends(get_db)) -> dict[str, float]:
    total_fees = db.query(func.sum(ThuPhi.amount)).scalar() or 0
    total_collected = db.query(func.sum(Payment.amount_paid)).scalar() or 0
    return {
        "expected_total": float(total_fees),
        "collected_total": float(total_collected),
        "outstanding": float(total_fees - total_collected),
    }


@router.post("/import", status_code=status.HTTP_200_OK)
def import_fees(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _: object = Depends(require_roles("admin", "ke_toan")),
) -> dict[str, int]:
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
            
            amount = float(row.get("amount", 0))
            if amount < 0:
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
    """Export fees to Excel file."""
    fees = db.query(ThuPhi).order_by(ThuPhi.created_at.desc()).all()
    
    headers = ["name", "description", "amount", "start_date", "due_date", "created_at"]
    data = [
        {
            "name": f.name,
            "description": f.description or "",
            "amount": f.amount,
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
