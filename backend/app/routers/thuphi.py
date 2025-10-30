from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from ..core.db import get_db
from ..core.dependencies import require_roles
from ..models.payment import Payment
from ..models.thuphi import ThuPhi
from ..schemas.payment import PaymentCreate, PaymentOut
from ..schemas.thuphi import ThuPhiCreate, ThuPhiOut, ThuPhiUpdate

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
    fee = db.query(ThuPhi).filter(ThuPhi.id == fee_id).first()
    if fee is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Fee not found")
    payment = Payment(
        citizen_name=data.citizen_name,
        household_code=data.household_code,
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


@router.get("/stats/summary")
def fee_statistics(db: Session = Depends(get_db)) -> dict[str, float]:
    total_fees = db.query(func.sum(ThuPhi.amount)).scalar() or 0
    total_collected = db.query(func.sum(Payment.amount_paid)).scalar() or 0
    return {
        "expected_total": float(total_fees),
        "collected_total": float(total_collected),
        "outstanding": float(total_fees - total_collected),
    }
