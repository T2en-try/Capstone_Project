from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status # type: ignore
from pydantic import BaseModel, ConfigDict, EmailStr, Field # type: ignore
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.router import get_current_admin
from app.auth.utils import hash_password
from app.core.database import get_db
from app.reports.models import User, UserRole


router = APIRouter(prefix="/api/employees", tags=["Employees"])


class EmployeeCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    role: UserRole = UserRole.OFFICER


class EmployeeUpdate(BaseModel):
    password: str | None = Field(default=None, min_length=8, max_length=128)
    role: UserRole | None = None
    is_active: int | None = Field(default=None, ge=0, le=1)


class EmployeeResponse(BaseModel):
    id: int
    email: EmailStr
    role: UserRole
    is_active: int
    created_at: datetime
    last_login: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


@router.get("", response_model=list[EmployeeResponse])
async def list_employees(
    _: object = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).order_by(User.created_at.desc()))
    return result.scalars().all()


@router.post("", response_model=EmployeeResponse, status_code=status.HTTP_201_CREATED)
async def create_employee(
    body: EmployeeCreate,
    _: object = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    employee = User(
        email=str(body.email).lower(),
        hashed_password=hash_password(body.password),
        role=body.role,
        is_active=1,
    )
    db.add(employee)
    try:
        await db.commit()
        await db.refresh(employee)
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=409, detail="อีเมลนี้มีอยู่ในระบบแล้ว")
    return employee


@router.patch("/{employee_id}", response_model=EmployeeResponse)
async def update_employee(
    employee_id: int,
    body: EmployeeUpdate,
    _: object = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.id == employee_id))
    employee = result.scalar_one_or_none()
    if not employee:
        raise HTTPException(status_code=404, detail="ไม่พบพนักงานที่ต้องการแก้ไข")

    if body.password is not None:
        employee.hashed_password = hash_password(body.password)
    if body.role is not None:
        employee.role = body.role
    if body.is_active is not None:
        employee.is_active = body.is_active

    await db.commit()
    await db.refresh(employee)
    return employee


@router.delete("/{employee_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_employee(
    employee_id: int,
    _: object = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.id == employee_id))
    employee = result.scalar_one_or_none()
    if not employee:
        raise HTTPException(status_code=404, detail="ไม่พบพนักงานที่ต้องการลบ")
    await db.delete(employee)
    await db.commit()